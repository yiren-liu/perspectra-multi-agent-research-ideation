from pydantic import BaseModel

from openai import OpenAI, AzureOpenAI

from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langgraph.func import entrypoint
from langgraph.store.memory import InMemoryStore
from langgraph.store.postgres import PostgresStore
from langgraph.store.postgres.base import PoolConfig
from langgraph.checkpoint.memory import MemorySaver
from langmem import create_memory_store_manager

from settings import app_settings

class ResearchIdeaMemory(BaseModel): # 
    """Store all new research thoughts and ideas as snippets."""
    id: str # the id of the memory, should be a number starting from 0 and increasing by 1 for each new memory
    title: str # the title of the memory, a 5-10 word summary of the memory
    snippet: str # a 1-3 sentence summary of the memory
    parent_id: list[str] # the ids of the parent memories which this memory is derived from, should be an empty list for the root memories


if app_settings.openai_api_type == "openai":
    client = OpenAI(
        api_key=app_settings.openai_api_key,
        base_url=app_settings.openai_api_base
    )
elif app_settings.openai_api_type == "azure":
    client = AzureOpenAI(
        api_key=app_settings.openai_api_key,
        azure_endpoint=app_settings.openai_api_base,
        api_version=app_settings.openai_api_version
    )
if app_settings.openai_api_type == "openai":
    llm = ChatOpenAI(
                    model=app_settings.openai_model,
        api_key=app_settings.openai_api_key,
        base_url=app_settings.openai_api_base
    )
elif app_settings.openai_api_type == "azure":
    llm = AzureChatOpenAI(
                    azure_deployment=app_settings.openai_model_mini,
        api_key=app_settings.openai_api_key,
        azure_endpoint=app_settings.openai_api_base,
        api_version=app_settings.openai_api_version
    )
def embed_texts(texts: list[str]) -> list[list[float]]:
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts
    )
    return [e.embedding for e in response.data]
# store = InMemoryStore(
#     index={
#         "dims": 1536,
#         "embed": embed_texts,
#     }
# ) 

def get_store():
    return PostgresStore.from_conn_string(
        conn_string=app_settings.postgres_url,
        index={
            "dims": 1536,
            "embed": embed_texts,
        },
        pool_config=PoolConfig(
            max_size=10,
            min_size=1,
        )
    )

# Run migrations once on module import
with get_store() as store:
    store.setup()

# Create a long-lived manager for memory operations
manager = create_memory_store_manager(
    llm,
    namespace=("forum", "{user_id}", "{agent_id}", "research_idea_snippets"),
    schemas=[ResearchIdeaMemory],
    instructions="""
Extract concise but insightful research thoughts and ideas as snippets.

When creating memories:
- Assign a unique 'id' as a string, starting from "0" and incrementing for each new memory
- Create a 'title' that summarizes the key idea in 5-10 words
- Write a 'snippet' that is 1-3 sentences long (20-60 words)
- The memories should evolve over time and be based on the previous memories and the new information provided through the discussion thread.
- DO NOT change or remove any existing memories, only add new ones. If you need to change or remove a memory, you should create a new memory with parent_id pointing to the previous memory.
- Track 'parent_id' as a list of IDs of any parent memories this idea builds upon (use empty list for new ideas)

Good snippets should:
1. Capture a single, coherent research insight or question
2. Use natural, human-like thought patterns (e.g., "What if we tried...", "This reminds me of...", "I wonder whether...")
3. Include enough context to be understood standalone
4. Focus on novel connections, hypotheses, or unexplored directions
5. Avoid overly technical jargon unless necessary

DO NOT extract:
- General facts or background information
- Summaries of existing work without new insights
- Vague statements without research value
- Lengthy explanations or detailed methodologies

Example good memories:
- {"id": "0", "title": "Cognitive biases in AI decision-making", "snippet": "I wonder if AI systems inherit the cognitive biases of their creators. We should investigate how these biases manifest in decision-making algorithms across different domains.", "parent_id": []}
- {"id": "1", "title": "LLMs as research assistants", "snippet": "What if we used LLMs to help researchers explore literature more efficiently? They could identify connections between papers that humans might miss due to volume constraints.", "parent_id": []}
- {"id": "2", "title": "Confirmation bias in recommendation systems", "snippet": "This reminds me of how recommendation algorithms might reinforce users' existing beliefs. Could we design systems that deliberately introduce diverse perspectives?", "parent_id": ["0"]}
- {"id": "3", "title": "Cross-disciplinary research synthesis", "snippet": "I'm thinking LLMs could excel at synthesizing research across disciplines that rarely interact. This might help bridge siloed knowledge domains in academia.", "parent_id": ["1"]}
- {"id": "4", "title": "Measuring cognitive diversity in AI outputs", "snippet": "We need metrics to evaluate cognitive diversity in AI outputs. Perhaps we could adapt psychological measures of thinking styles to quantify this?", "parent_id": ["0", "2"]}
- {"id": "5", "title": "Knowledge graph integration with LLMs", "snippet": "What if we combined knowledge graphs with LLMs to create more structured research assistants? This might address some of the hallucination issues while preserving their synthesis abilities.", "parent_id": ["1", "3"]}
""",
    enable_inserts=True,
    enable_deletes=True,
)

def memory_writer(messages: list, user_id: str, agent_id: str):
    """Write memories extracted from messages.
    
    This function creates a new store connection for each call
    to avoid connection closed issues.
    """
    with get_store() as store:
        # Use the entrypoint decorator only within this function's scope
        @entrypoint(store=store)
        def _write_memory(msgs):
            manager.invoke({"messages": msgs})
        
        # Call the decorated function
        _write_memory.invoke(messages, config={"user_id": user_id, "agent_id": agent_id})

def memory_reader(user_id: str, agent_id: str):
    """Read memories for a specific user and agent."""
    with get_store() as store:
        return store.search(
            ("forum", user_id, agent_id, "research_idea_snippets"),
            query="",
            limit=10
        )

def list_user_agents_with_memories(user_id: str):
    """List all agents that have memories for a specific user."""
    with get_store() as store:
        # Get all keys in the store
        all_keys = store.list_keys()
        
        # Filter keys that match the pattern ("forum", user_id, *, "research_idea_snippets")
        agent_ids = set()
        for key in all_keys:
            if len(key) == 4 and key[0] == "forum" and key[1] == user_id and key[3] == "research_idea_snippets":
                agent_ids.add(key[2])
        
        return list(agent_ids)