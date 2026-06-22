import asyncio
import json
import logging
import warnings
from typing import (
    Any,
    AsyncGenerator,
    Awaitable,
    Callable,
    Dict,
    List,
    Mapping,
    Sequence,
)

import json_repair

from autogen_core import CancellationToken, FunctionCall
from autogen_core.model_context import (
    ChatCompletionContext,
    UnboundedChatCompletionContext,
)
from autogen_core.models import (
    AssistantMessage,
    ChatCompletionClient,
    FunctionExecutionResult,
    FunctionExecutionResultMessage,
    SystemMessage,
    UserMessage,
)
from autogen_core.tools import FunctionTool, Tool
from autogen_core.models import LLMMessage
from typing_extensions import deprecated

from autogen_agentchat import EVENT_LOGGER_NAME
from autogen_agentchat.base import Handoff as HandoffBase
from autogen_agentchat.base import Response
from autogen_agentchat.messages import (
    AgentEvent,
    ChatMessage,
    HandoffMessage,
    MultiModalMessage,
    TextMessage,
    ToolCallExecutionEvent,
    ToolCallRequestEvent,
    ToolCallSummaryMessage,
)
from autogen_agentchat.state import AssistantAgentState
from autogen_agentchat.agents._base_chat_agent import BaseChatAgent

from app.chains.graph_rag import GraphRAGHandler
from app.agents.autogen_agents.tools.autogen.rag import create_graph_rag_search_tool, create_search_semantic_scholar_for_papers_tool, create_add_paper_to_graph_rag_tool, create_literature_review_tool
from app.agents.discussion_manager import DiscussionThreadManager

from app.agents.autogen_agents.memory._langgraph import memory_writer, memory_reader

event_logger = logging.getLogger(EVENT_LOGGER_NAME)

@deprecated("Moved to autogen_agentchat.base.Handoff. Will remove in 0.4.0.", stacklevel=2)
class Handoff(HandoffBase):
    """[DEPRECATED] Handoff configuration. Moved to :class:`autogen_agentchat.base.Handoff`. Will remove in 0.4.0."""

    def model_post_init(self, __context: Any) -> None:
        warnings.warn(
            "Handoff was moved to autogen_agentchat.base.Handoff. Importing from this will be removed in 0.4.0.",
            DeprecationWarning,
            stacklevel=2,
        )


class GraphRAGAgent(BaseChatAgent):
    def __init__(
        self,
        name: str,
        model_client: ChatCompletionClient,
        discussion_manager: DiscussionThreadManager,
        user_id: str,
        *,
        graph_rag_working_dir: str = "./temp/lightrag/shared",
        tools: List[Tool | Callable[..., Any] | Callable[..., Awaitable[Any]]] | None = None,
        handoffs: List[HandoffBase | str] | None = None,
        model_context: ChatCompletionContext | None = None,
        description: str = "An agent that provides assistance with ability to use tools.",
        system_message: (
            str | None
        ) = "You are a helpful AI assistant. Solve tasks using your tools. Reply with TERMINATE when the task has been completed.",
        reflect_on_tool_use: bool = False,
        tool_call_summary_format: str = "{result}",
    ):
        super().__init__(name=name, description=description)
        self._model_client = model_client
        self._discussion_manager = discussion_manager
        self._user_id = user_id
        self._rag_handler = GraphRAGHandler(working_dir=graph_rag_working_dir)
        if system_message is None:
            self._system_messages = []
        else:
            self._system_messages = [SystemMessage(content=system_message)]
        self._tools: List[Tool] = []
        self._rag_tools: List[Tool] = []
        if tools is not None:
            if model_client.model_info["function_calling"] is False:
                raise ValueError("The model does not support function calling.")
            for tool in tools:
                if isinstance(tool, Tool):
                    self._tools.append(tool)
                elif callable(tool):
                    if hasattr(tool, "__doc__") and tool.__doc__ is not None:
                        description = tool.__doc__
                    else:
                        description = ""
                    self._tools.append(FunctionTool(tool, description=description))
                else:
                    raise ValueError(f"Unsupported tool type: {type(tool)}")
                
        # append the rag tool
        self._rag_tools.append(create_graph_rag_search_tool(self._rag_handler))
        # apppend other tools for literature review
        # self._tools.append(create_search_semantic_scholar_for_papers_tool())
        # self._tools.append(create_add_paper_to_graph_rag_tool(self._rag_handler))
        self._tools.append(create_literature_review_tool(self._rag_handler))
        
        # Check if tool names are unique.
        tool_names = [tool.name for tool in self._tools]
        if len(tool_names) != len(set(tool_names)):
            raise ValueError(f"Tool names must be unique: {tool_names}")
        # Handoff tools.
        self._handoff_tools: List[Tool] = []
        self._handoffs: Dict[str, HandoffBase] = {}
        if handoffs is not None:
            if model_client.model_info["function_calling"] is False:
                raise ValueError("The model does not support function calling, which is needed for handoffs.")
            for handoff in handoffs:
                if isinstance(handoff, str):
                    handoff = HandoffBase(target=handoff)
                if isinstance(handoff, HandoffBase):
                    self._handoff_tools.append(handoff.handoff_tool)
                    self._handoffs[handoff.name] = handoff
                else:
                    raise ValueError(f"Unsupported handoff type: {type(handoff)}")
        # Check if handoff tool names are unique.
        handoff_tool_names = [tool.name for tool in self._handoff_tools]
        if len(handoff_tool_names) != len(set(handoff_tool_names)):
            raise ValueError(f"Handoff names must be unique: {handoff_tool_names}")
        # Check if handoff tool names not in tool names.
        if any(name in tool_names for name in handoff_tool_names):
            raise ValueError(
                f"Handoff names must be unique from tool names. Handoff names: {handoff_tool_names}; tool names: {tool_names}"
            )
        if model_context is not None:
            self._model_context = model_context
        else:
            self._model_context = UnboundedChatCompletionContext()
        self._reflect_on_tool_use = reflect_on_tool_use
        self._tool_call_summary_format = tool_call_summary_format
        self._is_running = False

    @property
    def produced_message_types(self) -> Sequence[type[ChatMessage]]:
        """The types of messages that the assistant agent produces."""
        message_types: List[type[ChatMessage]] = [TextMessage]
        if self._handoffs:
            message_types.append(HandoffMessage)
        if self._tools:
            message_types.append(ToolCallSummaryMessage)
        return tuple(message_types)

    async def on_messages(self, messages: Sequence[ChatMessage], cancellation_token: CancellationToken) -> Response:
        async for message in self.on_messages_stream(messages, cancellation_token):
            if isinstance(message, Response):
                return message
        raise AssertionError("The stream should have returned the final result.")

    async def on_messages_stream(
        self, messages: Sequence[ChatMessage], cancellation_token: CancellationToken
    ) -> AsyncGenerator[AgentEvent | ChatMessage | Response, None]:
        # Add messages to the model context.
        for msg in messages:
            if isinstance(msg, MultiModalMessage) and self._model_client.model_info["vision"] is False:
                raise ValueError("The model does not support vision.")
            await self._model_context.add_message(UserMessage(content=msg.content, source=msg.source))

        # Inner messages.
        inner_messages: List[AgentEvent | ChatMessage] = []

        # Generate an inference result based on the current model context.
        # add the system message with the rag context
        llm_messages = self._system_messages + await self._model_context.get_messages()
        system_message_with_rag_context = await self.get_system_message_with_rag_context(llm_messages, cancellation_token)
        llm_messages = [
            SystemMessage(content=system_message_with_rag_context, source=self.name),
        ] + await self._model_context.get_messages()
        
        # add to memory
        llm_messages_for_memory = []
        for msg in llm_messages:
            if isinstance(msg, UserMessage):
                llm_messages_for_memory.append({
                    "role": "user",
                    "content": msg.content.__str__(),
                })
            elif isinstance(msg, AssistantMessage):
                llm_messages_for_memory.append({
                    "role": "assistant",
                    "content": msg.content.__str__(),
                })
            elif isinstance(msg, SystemMessage):
                llm_messages_for_memory.append({
                    "role": "system",
                    "content": msg.content.__str__(),
                })
            elif isinstance(msg, ToolCallSummaryMessage):
                llm_messages_for_memory.append({
                    "role": "assistant",
                    "content": msg.content.__str__(),
                })
            elif isinstance(msg, FunctionExecutionResultMessage):
                llm_messages_for_memory.append({
                    "role": "assistant",
                    "content": msg.content.__str__(),
                })
            # else:
            #     raise ValueError(f"Unsupported message type: {type(msg)}")
        
        # add discussion thread to memory
        discussion_thread = self._discussion_manager.get_thread()
        llm_messages_for_memory.append({
            "role": "user",
            "content": "The current existing discussion thread is as follows: {discussion_thread}".format(discussion_thread=discussion_thread)
        })
        memory_writer(llm_messages_for_memory, self._user_id, self.name)
        memories = memory_reader(self._user_id, self.name)
        formatted_memories = "\n".join([f"- {memory.value['content']['snippet']}" for memory in memories])
        
        trigger_message = """The current discussion thread is as follows:
<discussion_thread>
{discussion_thread}
</discussion_thread>

You also have the following memories of your own previous thoughts and ideas:
<memories>
{memories}
</memories>

Now, you are going to continue the discussion based on the discussion thread and generate a new response.
"""
        trigger_message = trigger_message.format(discussion_thread=self._discussion_manager.get_thread(), memories=formatted_memories)
        llm_messages.append(UserMessage(content=trigger_message, source=self.name))

        # TODO: implement the reasoning reflection process
        # before generating the response, perform thinking and reasoning

        result = await self._model_client.create(
            llm_messages, tools=self._tools + self._handoff_tools, cancellation_token=cancellation_token
        )


        # Add the response to the model context.
        await self._model_context.add_message(AssistantMessage(content=result.content, source=self.name))

        # Check if the response is a string and return it.
        if isinstance(result.content, str):
            yield Response(
                chat_message=TextMessage(content=result.content, source=self.name, models_usage=result.usage),
                inner_messages=inner_messages,
            )
            return

        # Process tool calls.
        assert isinstance(result.content, list) and all(isinstance(item, FunctionCall) for item in result.content)
        tool_call_msg = ToolCallRequestEvent(content=result.content, source=self.name, models_usage=result.usage)
        event_logger.debug(tool_call_msg)
        # Add the tool call message to the output.
        inner_messages.append(tool_call_msg)
        yield tool_call_msg

        # Execute the tool calls.
        results = await asyncio.gather(*[self._execute_tool_call(call, cancellation_token) for call in result.content])
        tool_call_result_msg = ToolCallExecutionEvent(content=results, source=self.name)
        event_logger.debug(tool_call_result_msg)
        await self._model_context.add_message(FunctionExecutionResultMessage(content=results))
        inner_messages.append(tool_call_result_msg)
        yield tool_call_result_msg

        # Detect handoff requests.
        handoffs: List[HandoffBase] = []
        for call in result.content:
            if call.name in self._handoffs:
                handoffs.append(self._handoffs[call.name])
        if len(handoffs) > 0:
            if len(handoffs) > 1:
                # show warning if multiple handoffs detected
                warnings.warn(
                    f"Multiple handoffs detected only the first is executed: {[handoff.name for handoff in handoffs]}",
                    stacklevel=2,
                )
            # Return the output messages to signal the handoff.
            yield Response(
                chat_message=HandoffMessage(content=handoffs[0].message, target=handoffs[0].target, source=self.name),
                inner_messages=inner_messages,
            )
            return

        if self._reflect_on_tool_use:
            # Generate another inference result based on the tool call and result.
            llm_messages = self._system_messages + await self._model_context.get_messages()

            # TODO: implement the reasoning reflection process
            # before generating the response, perform thinking and reasoning



            result = await self._model_client.create(llm_messages, cancellation_token=cancellation_token)
            assert isinstance(result.content, str)
            # Add the response to the model context.
            await self._model_context.add_message(AssistantMessage(content=result.content, source=self.name))
            # Yield the response.
            yield Response(
                chat_message=TextMessage(content=result.content, source=self.name, models_usage=result.usage),
                inner_messages=inner_messages,
            )
        else:
            # Return tool call result as the response.
            tool_call_summaries: List[str] = []
            for i in range(len(tool_call_msg.content)):
                tool_call_summaries.append(
                    self._tool_call_summary_format.format(
                        tool_name=tool_call_msg.content[i].name,
                        arguments=tool_call_msg.content[i].arguments,
                        result=tool_call_result_msg.content[i].content,
                    ),
                )
            tool_call_summary = "\n".join(tool_call_summaries)
            yield Response(
                chat_message=ToolCallSummaryMessage(
                    content=tool_call_summary, 
                    source=self.name,
                    tool_calls=tool_call_msg.content,
                    results=tool_call_result_msg.content,
                ),
                inner_messages=inner_messages,
            )

    async def _execute_tool_call(
        self, tool_call: FunctionCall, cancellation_token: CancellationToken
    ) -> FunctionExecutionResult:
        """Execute a tool call and return the result."""
        try:
            if not self._tools + self._rag_tools + self._handoff_tools:
                raise ValueError("No tools are available.")
            tool = next((t for t in self._tools + self._rag_tools + self._handoff_tools if t.name == tool_call.name), None)
            if tool is None:
                raise ValueError(f"The tool '{tool_call.name}' is not available.")
            arguments = json.loads(tool_call.arguments)
            result = await tool.run_json(arguments, cancellation_token)
            result_as_str = tool.return_value_as_string(result)
            return FunctionExecutionResult(content=result_as_str, call_id=tool_call.id, is_error=False, name=tool_call.name)
        except Exception as e:
            return FunctionExecutionResult(content=f"Error: {e}", call_id=tool_call.id, is_error=True, name=tool_call.name)
    
    async def on_reset(self, cancellation_token: CancellationToken) -> None:
        """Reset the assistant agent to its initialization state."""
        await self._model_context.clear()

    async def save_state(self) -> Mapping[str, Any]:
        """Save the current state of the assistant agent."""
        model_context_state = await self._model_context.save_state()
        return AssistantAgentState(llm_context=model_context_state).model_dump()

    async def load_state(self, state: Mapping[str, Any]) -> None:
        """Load the state of the assistant agent"""
        assistant_agent_state = AssistantAgentState.model_validate(state)
        # Load the model context state.
        await self._model_context.load_state(assistant_agent_state.llm_context)

    # async def generate_rag_response(self, llm_messages: List[LLMMessage]) -> str:
    #     result = await self._rag_handler.aquery(llm_messages[-1].content)
    #     # result = await self._rag_handler.aquery_context_only(llm_messages[-1].content)
    #     message = CreateResult(content=result, usage=None, finish_reason="stop", cached=False)
    #     return message

    async def get_system_message_with_rag_context(self, llm_messages: List[LLMMessage], cancellation_token: CancellationToken) -> str:
        # TODO: implement this
        # 1: generate the queries, by adding a new user message, asking the model to generate a function call to search the graph RAG
        # 2: get the results
        # 3: format the results into a system message, saying "Here are the papers that are relevant to the conversation from your own knowledge base: {results}"
        # 4: return the system message
        llm_messages.append(
            UserMessage(content="Now based on the above context, generate a function call to search your RAG knowledge base for relevant information.", source="user")
        )
        result = await self._model_client.create(
            llm_messages, tools=self._rag_tools, cancellation_token=cancellation_token
        )
        # execute the function call, and return the results
        results = await asyncio.gather(*[self._execute_tool_call(call, cancellation_token) for call in result.content])
        return f"<RAG_CONTEXT>\nHere are the papers that are relevant to the conversation from your own knowledge base: {results[0].content}</RAG_CONTEXT>P.S., if the context is empty, it means there are no relevant papers in your knowledge base.\n\n" + llm_messages[0].content

