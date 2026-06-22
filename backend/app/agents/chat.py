import os
import re
import json
import json_repair
import uuid
from typing import List, Dict, Any
from pydantic import BaseModel
from pydantic import ValidationError
from datetime import datetime

from autogen_core import CancellationToken
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.base import TerminationCondition
from autogen_ext.models.openai import OpenAIChatCompletionClient, AzureOpenAIChatCompletionClient

# from autogen_agentchat.teams import RoundRobinGroupChat, SelectorGroupChat
from autogen_agentchat.agents import SocietyOfMindAgent
from autogen_agentchat.base import TaskResult
from autogen_agentchat.messages import TextMessage
from autogen_agentchat.conditions import TextMentionTermination, MaxMessageTermination, ExternalTermination


from app.prompts.persona import get_persona_agent_forum_system_prompt, get_group_chat_task_prompt_from_user_query, get_persona_agent_forum_reasoning_prompt, get_persona_agent_chat_system_prompt
from app.agents.autogen_agents.forum_graphrag_agent_agentchat import GraphRAGAgent
from app.agents.autogen_agents.graphrag_agent import GraphRAGAgentChat
from app.agents.base import PersonaAgent
from app.agents.utils import search_paper_by_query, retrieve_papers_by_ids, load_persona_profile
from app.chains import load_demo_personas, formatting_personas_for_frontend
from app.agents.discussion_manager import DiscussionThreadManager
from app.agents.autogen_agents.teams.intent_selector_group_chat import IntentBasedSelectorGroupChat

from settings import app_settings

import logging
logging.basicConfig(level=logging.ERROR)

logger = logging.getLogger(__name__)


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder that converts datetime objects to ISO format strings."""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def safe_json_dumps(obj, **kwargs):
    """Safe JSON serialization that handles datetime objects."""
    return json.dumps(obj, cls=DateTimeEncoder, **kwargs)


class Message(BaseModel):
    author: str
    content: str

class DiscussionThread(BaseModel):
    message: Message
    replies: List[Message]

class Discussion(BaseModel):
    topic: str
    discussion_thread: List[DiscussionThread]

class Citation(BaseModel):
    paper_id: str
    title: str
    abstract: str | None
    authors: List[str]
    year: int | None
    url: str | None
    venue: str | None
    citation_count: int | None

class ForumThread(BaseModel):
    discussion: Discussion
    citations: List[Citation]

class AgentGroupChat:
    def __init__(self, agents: List[GraphRAGAgent], termination_condition: TerminationCondition):
        self.agents = agents
        self.termination_flipper = ExternalTermination()
        self.termination_condition = termination_condition | self.termination_flipper
        if app_settings.openai_api_type == "openai":
            self.model_client = OpenAIChatCompletionClient(
                model=app_settings.openai_model,
                api_key=app_settings.openai_api_key,
                base_url=app_settings.openai_api_base
            )
        elif app_settings.openai_api_type == "azure":
            self.model_client = AzureOpenAIChatCompletionClient(
                model=app_settings.openai_model,
                azure_deployment=app_settings.openai_model,
                api_key=app_settings.openai_api_key,
                azure_endpoint=app_settings.openai_api_base,
                api_version=app_settings.openai_api_version
            )
        self.team = IntentBasedSelectorGroupChat(
            agents, 
            termination_condition=self.termination_condition,
            model_client=self.model_client,
            # selector_func=self.selector_func
        )

    async def run_chat(self, task: str):
        stream = self.team.run_stream(task=task)
        messages = []
        async for message in stream:
            messages.append(message)
            logger.debug(message)
        return messages
    
    async def run_chat_streaming(self, user_query: str):
        task = get_group_chat_task_prompt_from_user_query(user_query)
        stream = self.team.run_stream(task=task)
        async for message in stream:
            if isinstance(message, TextMessage):
                yield message.model_dump_json() + "\n"
    
    def set_manual_termination(self) -> None:
        self.termination_flipper.set()

    def remove_member(self, agent_name: str) -> None:
        # TODO: implement this
        raise NotImplementedError("Not implemented")
    
    def add_member(self, agent: AssistantAgent) -> None:
        # TODO: implement this
        raise NotImplementedError("Not implemented")
    
    def set_user_persona(self, user_persona_id: str) -> None:
        # TODO: implement this
        raise NotImplementedError("Not implemented")


def create_agent(assistant_name: str, user_id: str, agent_description: str, system_prompt: str, graph_rag_working_dir: str = None, discussion_manager: DiscussionThreadManager = None):
    if graph_rag_working_dir is None:
        graph_rag_working_dir = f"{app_settings.lightrag_working_dir}/{user_id}/shared"
    
    if app_settings.openai_api_type == "openai":
        model_client = OpenAIChatCompletionClient(
            model=app_settings.openai_model,
            api_key=app_settings.openai_api_key,
            base_url=app_settings.openai_api_base
        )
    elif app_settings.openai_api_type == "azure":
        model_client = AzureOpenAIChatCompletionClient(
            model=app_settings.openai_model,
            azure_deployment=app_settings.openai_model,
            api_key=app_settings.openai_api_key,
            azure_endpoint=app_settings.openai_api_base,
            api_version=app_settings.openai_api_version
        )
    agent = GraphRAGAgent(
        assistant_name, 
        model_client=model_client, 
        system_message=system_prompt, 
        description=str(agent_description),
        graph_rag_working_dir=graph_rag_working_dir, 
        reflect_on_tool_use=True,
        discussion_manager=discussion_manager,
        user_id=user_id
    )
    return agent


def create_agent_chat(assistant_name: str, user_id: str, agent_description: str, system_prompt: str, graph_rag_working_dir: str = None, discussion_manager: DiscussionThreadManager = None):
    if graph_rag_working_dir is None:
        graph_rag_working_dir = f"{app_settings.lightrag_working_dir}/{user_id}/shared"
    
    if app_settings.openai_api_type == "openai":
        model_client = OpenAIChatCompletionClient(
            model=app_settings.openai_model,
            api_key=app_settings.openai_api_key,
            base_url=app_settings.openai_api_base
        )
    elif app_settings.openai_api_type == "azure":
        model_client = AzureOpenAIChatCompletionClient(
            model=app_settings.openai_model,
            azure_deployment=app_settings.openai_model,
            api_key=app_settings.openai_api_key,
            azure_endpoint=app_settings.openai_api_base,
            api_version=app_settings.openai_api_version
        )
    agent = GraphRAGAgentChat(
        assistant_name, 
        model_client=model_client, 
        system_message=system_prompt, 
        description=str(agent_description),
        graph_rag_working_dir=graph_rag_working_dir, 
        # reflect_on_tool_use=True,
        # user_id=user_id
    )
    return agent

def create_agent_from_persona(persona: Dict[str, Any], user_id: str, graph_rag_working_dir: str = None, discussion_manager: DiscussionThreadManager = None):
    # maintain a json of persona profile in the graph_rag_working_dir
    ## create the folder if it doesn't exist
    if graph_rag_working_dir is None:
        sanitized_name = re.sub(r'[^a-zA-Z0-9_]', '_', persona["name"])
        graph_rag_working_dir = f"{app_settings.lightrag_working_dir}/{user_id}/{sanitized_name}/default"
    
    if not os.path.exists(graph_rag_working_dir):
        os.makedirs(graph_rag_working_dir)
    with open(os.path.join(graph_rag_working_dir, "persona_profile.json"), "w") as f:
        json.dump(persona, f)
    # system_prompt = get_persona_agent_forum_system_prompt().format(persona=persona["personaDescription"])
    system_prompt = get_persona_agent_forum_reasoning_prompt().format(persona=persona["personaDescription"])
    sanitized_name = re.sub(r'[^a-zA-Z0-9_]', '_', persona["name"])
    agent_description = persona["personaDescription"]
    return create_agent(sanitized_name, user_id, agent_description, system_prompt, graph_rag_working_dir, discussion_manager)


def create_agent_from_persona_chat(persona: Dict[str, Any], user_id: str, graph_rag_working_dir: str = None):
    # maintain a json of persona profile in the graph_rag_working_dir
    ## create the folder if it doesn't exist
    if graph_rag_working_dir is None:
        sanitized_name = re.sub(r'[^a-zA-Z0-9_]', '_', persona["name"])
        graph_rag_working_dir = f"{app_settings.lightrag_working_dir}/{user_id}/{sanitized_name}/default"
    
    if not os.path.exists(graph_rag_working_dir):
        os.makedirs(graph_rag_working_dir)
    with open(os.path.join(graph_rag_working_dir, "persona_profile.json"), "w") as f:
        json.dump(persona, f)
    # system_prompt = get_persona_agent_forum_system_prompt().format(persona=persona["personaDescription"])
    system_prompt = get_persona_agent_chat_system_prompt().format(persona=persona["personaDescription"])
    sanitized_name = re.sub(r'[^a-zA-Z0-9_]', '_', persona["name"])
    agent_description = persona["personaDescription"]
    return create_agent_chat(sanitized_name, user_id, agent_description, system_prompt, graph_rag_working_dir)


def extract_citations(text: str) -> List[str]:
    # Define the regex pattern to match <paper_id>...</paper_id>
    pattern = r'<paper_id>(.*?)</paper_id>'
    # Use re.findall to extract all matches
    citations = re.findall(pattern, text)
    return citations

def parse_citations_from_thread(discussion_thread: DiscussionThreadManager) -> List[Citation]:
    """
    Extract citation IDs from the discussion thread, retrieve the associated papers,
    and convert them into a list of Citation objects.
    """
    thread_json = safe_json_dumps(discussion_thread.get_thread())
    citation_ids = extract_citations(thread_json)
    if citation_ids:
        papers = retrieve_papers_by_ids(citation_ids)
    else:
        papers = []
    citations = [
        Citation(
            paper_id=paper.id,
            title=paper.title,
            abstract=paper.abstract,
            authors=paper.authors,
            year=paper.year,
            url=paper.url,
            venue=paper.venue,
            citation_count=paper.citationCount
        )
        for paper in papers
    ]
    return citations

def parse_citations_from_message(message: str):
    citations = extract_citations(message)
    if citations:
        papers = retrieve_papers_by_ids(citations)
    else:
        papers = []
    citations = [
        Citation(
            paper_id=paper.id,
            title=paper.title,
            abstract=paper.abstract,
            authors=paper.authors,
            year=paper.year,
            url=paper.url,
            venue=paper.venue,
            citation_count=paper.citationCount
        )
        for paper in papers
    ]
    return citations

async def run_forum_thread_simulation(topic: str, topic_description: str, user_id: str, discussion_thread: DiscussionThreadManager):
    # first generate and yield a random thread id
    yield safe_json_dumps({
        "type": "NEW_THREAD",
        "body": {
            "thread_id": discussion_thread.thread_id,
            "topic": topic,
            "topic_description": topic_description,
            "citations": [c.model_dump() for c in parse_citations_from_thread(discussion_thread)]
        }
    }) + "\n"

    persona_agent = PersonaAgent()
    topic_text = f"Topic: {topic}\nDescription: {topic_description}\n"
    personas = persona_agent.generate_personas(topic_text, "")
    personas = [formatting_personas_for_frontend(persona) for persona in personas]

    yield safe_json_dumps({
        "type": "NEW_PERSONAS",
        "body": {"personas": personas, "thread_id": discussion_thread.thread_id}
    }) + "\n"

    agent1 = create_agent_from_persona(
        personas[0],
        user_id=user_id,
        graph_rag_working_dir=f"{app_settings.lightrag_working_dir}/{user_id}/{personas[0]['name']}/default",
        discussion_manager=discussion_thread
    )
    agent2 = create_agent_from_persona(
        personas[1],
        user_id=user_id,
        graph_rag_working_dir=f"{app_settings.lightrag_working_dir}/{user_id}/{personas[1]['name']}/default",
        discussion_manager=discussion_thread
    )
    agent3 = create_agent_from_persona(
        personas[2],
        user_id=user_id,
        graph_rag_working_dir=f"{app_settings.lightrag_working_dir}/{user_id}/{personas[2]['name']}/default",
        discussion_manager=discussion_thread
    )
    external_termination = ExternalTermination()
    outter_termination = MaxMessageTermination(10) | TextMentionTermination("TERMINATE") | external_termination
    team = AgentGroupChat([agent1, agent2, agent3], termination_condition=outter_termination)

    stream = team.team.run_stream(
        task=f"Discuss the following topic as if you are in an online discussion forum: '{topic}'"
    )
    async for message in stream:
        if isinstance(message, TextMessage):
            if message.source == "user":
                continue
            try:
                discussion = json_repair.loads(message.model_dump()['content'])
                discussion_thread.add_message(
                    author=message.source,
                    chosen_action=discussion['chosen_action'],
                    reason=discussion['reason'],
                    content=discussion['next_response']['content'],
                    reply_to=discussion['next_response']['reply_to_msg_id'],
                    multi_level_summary=discussion['multi_level_summary']
                )
            except ValidationError as e:
                logger.error(f"Validation error: {e}")
                external_termination.set()
                yield safe_json_dumps({"type": "TERMINATE", "body": {"thread_id": discussion_thread.thread_id}}) + "\n"
                return

            # Use the new utility function to parse citations
            citations = parse_citations_from_thread(discussion_thread)
            forum_thread = {
                "discussion": discussion_thread.get_thread(),
                "citations": [c.model_dump() for c in citations]
            }
            new_message = message.model_dump()
            new_message['content'] = safe_json_dumps(forum_thread)
            
            # Ensure each message is a complete JSON line with newline terminator
            message_json = safe_json_dumps({
                "type": "AGENT_MESSAGE",
                "body": {"message": new_message, "thread_id": discussion_thread.thread_id}
            }) + "\n"
            yield message_json
            
    # Terminate message
    yield safe_json_dumps({"type": "TERMINATE", "body": {"thread_id": discussion_thread.thread_id}}) + "\n"

async def get_agent_response(agent_name: str, message: str | None, action: str | None, user_id: str, discussion_thread: DiscussionThreadManager):
    """
    Get the response from an agent given the message and the discussion thread.
    Applies citation parsing to extract citations from the discussion thread and
    includes them in the returned response.
    """
    # look up the persona profile from the agent name
    persona_profile = load_persona_profile(agent_name, user_id)

    agent = create_agent_from_persona(
        persona_profile, 
        user_id=user_id,
        graph_rag_working_dir=f"{app_settings.lightrag_working_dir}/{user_id}/{agent_name}/default", 
        discussion_manager=discussion_thread
    )

    task = f"Continue the discussion by generating a response to the following message:\n{message}.\n"
    if action:
        task = task + f" The user has requested you to take the following action: {action} when thinking."
    else:
        task = task + f" The user has not specified any action. Infer your own action based on the discussion."
    task_result = await agent.run(
        task=task
    )
    if isinstance(task_result, TaskResult):
        res_str = task_result.messages[-1].content
        try:
            res_json = json_repair.loads(res_str)
        except Exception as e:
            return ValueError("Agent run failed. Response is not a valid JSON.")
        
        # Apply citation parsing
        citations = parse_citations_from_message(res_json["next_response"]["content"])
        res_json["citations"] = [c.model_dump() for c in citations]

        return res_json
    else:
        raise ValueError("Agent run failed.")


async def main():
    model_client = OpenAIChatCompletionClient(
        model=app_settings.openai_model,
        api_key=os.getenv("OPENAI_API_KEY")
    )

    topic = "How can AI improve human creativity?"
    user_id = "123"  # Sample user ID for testing

    persona_agent = PersonaAgent()

    # personas = load_demo_personas()
    personas = persona_agent.generate_personas(topic, "")
    personas = [formatting_personas_for_frontend(persona) for persona in personas]

    agent1 = create_agent_from_persona(personas[0], user_id=user_id, graph_rag_working_dir=f"{app_settings.lightrag_working_dir}/{user_id}/{personas[0]['name']}/default")
    agent2 = create_agent_from_persona(personas[1], user_id=user_id, graph_rag_working_dir=f"{app_settings.lightrag_working_dir}/{user_id}/{personas[1]['name']}/default")
    # inner_termination = MaxMessageTermination(3) | TextMentionTermination("TERMINATE")
    # inner_team = RoundRobinGroupChat([agent1, agent2], termination_condition=inner_termination)

    agent3 = create_agent_from_persona(personas[2], user_id=user_id, graph_rag_working_dir=f"{app_settings.lightrag_working_dir}/{user_id}/{personas[2]['name']}/default")
    outter_termination = MaxMessageTermination(20) | TextMentionTermination("TERMINATE")
    # team = RoundRobinGroupChat([society_of_mind_agent, agent3, agent4], termination_condition=outter_termination)
    team = AgentGroupChat([agent1, agent2, agent3], termination_condition=outter_termination)

    stream = team.team.run_stream(task=f"Discuss the following topic as if you are in an online discussion forum: '{topic}'")
    async for message in stream:
        with open("message.jsonl", "a") as f:
            if isinstance(message, TextMessage):
                f.write(message.model_dump_json() + "\n")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
