import asyncio
import base64
import json
import logging
import os
import shutil
import glob
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Literal
import jwt
import re
import zlib
import time
import sys
import openai
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Security, status, WebSocket, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from settings import app_settings
from starlette.requests import Request
from starlette.responses import StreamingResponse
from autogen_agentchat.conditions import TextMentionTermination, MaxMessageTermination, ExternalTermination

from app.agents.base import PersonaAgent
from app.chains import load_demo_personas_for_prompt, load_demo_papers, load_demo_personas
from app.chains.graph_rag import GraphRAGHandler
from app.app_types.persona_types import Persona, ChatMessage, GeneratePersonaQuestionsSuggestionsRequest
from app.app_types.thread_types import DiscussionThread
from app.agents.chat import AgentGroupChat, create_agent, create_agent_from_persona, create_agent_from_persona_chat, DiscussionThreadManager, parse_citations_from_message
from app.agents import load_dummy_threads
from app.agents.chat import run_forum_thread_simulation, get_agent_response
from app.agents.utils import retrieve_papers_by_ids, load_persona_profile
from app.templates import get_full_persona_template, get_default_persona_template
from app.agents.autogen_agents.memory._langgraph import memory_reader, list_user_agents_with_memories
from app.agents.chat import formatting_personas_for_frontend
from auth.jwt_auth import jwt_auth

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# from db_utils.aws_rds import RDSClient
from db_utils.supabase_rds import RDSClient
RDS_CLIENT = RDSClient()
# test write
RDS_CLIENT.write_log("server_init_session_id", "server_init_type", {"server_init_log_body": ""}, "user_email_address")

class LogData(BaseModel):
    type: str
    user: str
    log_body: str

class UserStudyLogData(BaseModel):
    user_id: str
    log_type: str
    log_data: dict
    timestamp: Optional[str] = None

class PaperInfo(BaseModel):
    id: str
    title: str
    abstract: str
    authors: List[str]
    url: str
    topic: str
    year: str
    venue: str
    citationCount: str

class PersonaKGRequest(BaseModel):
    persona: dict
    topic: str
    papers: List[PaperInfo]


class Paper2TableSchemeRequest(BaseModel):
    num_attributes: int
    papers: List[PaperInfo]

class SearchPapersFromTopicRequest(BaseModel):
    topic: str

class GeneratePersonasFromPapersTopicRequest(BaseModel):
    topic: str
    papers: List[PaperInfo]

class GenerateTableFromPapersRequest(BaseModel):
    num_attributes: int
    papers: List[PaperInfo]
    personas: Optional[List[dict]] = []

class GenerateTableFromDialogueHistoryRequest(BaseModel):
    dialogue_history: List[ChatMessage]
    personas: Optional[List[dict]] = []

class ChatRequest(BaseModel):
    user_query: str
    personas: Optional[List[dict]] = []
    user_persona_id: Optional[str] = None

class GetPersonaDescEditsRequest(BaseModel):
    instruction: str
    original_persona: dict

class ForumThreadTopic(BaseModel):
    topic: str
    topic_description: str

class CreateNewThreadRequest(BaseModel):
    topic: ForumThreadTopic

class AgentInfo(BaseModel):
    name: str
    paper_ids: List[str]

class GetPersonaProfileRequest(BaseModel):
    agent_name: str

class GetPersonaLiteratureRequest(BaseModel):
    agent_name: str

class RequestAgentResponseRequest(BaseModel):
    agent_name: str
    action: str | None
    message: str | None
    discussion_thread: DiscussionThread

class GenerateThreadSuggestionsRequest(BaseModel):
    high_level_idea: str

class AgentResponseEvent(BaseModel):
    type: str
    data: Any

class ChatCompletionEvent(BaseModel):
    type: str
    message: Dict[str, Any]
    
class ToggleFavoritePostRequest(BaseModel):
    thread_id: str
    post_id: str

class GenerateProjectSummaryRequest(BaseModel):
    thread_ids: List[str]
    only_favorites: bool = False

class GetAgentMemoriesRequest(BaseModel):
    agent_id: str

baseRouter = APIRouter()

# session data store
class SessionData:
    def __init__(self):
        self.sessionId2agentGroupChat: Dict[str, AgentGroupChat | None] = {}

    def get_agent_group_chat(self, session_id: str) -> AgentGroupChat | None:
        return self.sessionId2agentGroupChat.get(session_id, None)
    
    def set_agent_group_chat(self, session_id: str, agent_group_chat: AgentGroupChat) -> None:
        self.sessionId2agentGroupChat[session_id] = agent_group_chat

sessionDataStoreLock = asyncio.Lock()
sessionDataStore = SessionData()
# Dependency to access session data
async def get_session_agent_group_chat(request: Request):
    session_id = get_session_id(request)
    async with sessionDataStoreLock:
        return sessionDataStore.get_agent_group_chat(session_id)
def set_agent_group_chat(session_id: str, agent_group_chat: AgentGroupChat) -> None:
    sessionDataStore.set_agent_group_chat(session_id, agent_group_chat)

def get_session_id(request: Request) -> str:
    request.session["session_id"] = request.session.get("session_id")
    session_id = request.session["session_id"]

    if session_id is None:
        session_id = str(uuid.uuid4())  # Or your own method of generating a unique session ID
        request.session["session_id"] = session_id
    return session_id

def get_session_graphrag_working_dir(request: Request) -> str:
    return f"./temp/lightrag/{get_session_id(request)}"

@baseRouter.get("/")
def root_api_v1(request: Request):
    get_session_id(request)
    return {"message": "Hello World from api/v1"}

@baseRouter.get("/get_demo_personas")
def get_demo_personas(request: Request):
    return load_demo_personas()

@baseRouter.get("/get_demo_papers")
def get_demo_papers(request: Request):
    return load_demo_papers()

@baseRouter.post("/search_papers_from_topic")
async def search_papers_from_topic(request: Request, search_papers_from_topic_request: SearchPapersFromTopicRequest):
    agent = PersonaAgent()
    papers = agent.search_papers_from_topic(search_papers_from_topic_request.topic)
    return {"papers": papers}

@baseRouter.post("/generate_personas_from_papers_topic")
async def generate_personas_from_papers_topic(request: Request, generate_personas_from_papers_topic_request: GeneratePersonasFromPapersTopicRequest):
    agent = PersonaAgent()
    personas, literature_review = agent.generate_personas_from_papers_topic(generate_personas_from_papers_topic_request.topic, generate_personas_from_papers_topic_request.papers)
    return {"personas": personas, "literature_review": literature_review}

@baseRouter.post("/get_persona_kg")
async def get_persona_kg(request: Request, persona_kg_request: PersonaKGRequest):
    session_id = get_session_id(request)
    try:
        agent = PersonaAgent()
        loop = asyncio.get_event_loop()
        queries = await loop.run_in_executor(None, lambda: agent.generate_inquisitive_questions_from_persona(persona_kg_request.persona, persona_kg_request.topic))

        graph_rag_handler = GraphRAGHandler(f"./temp/lightrag/{session_id}")
        # results = await loop.run_in_executor(None, lambda: graph_rag_handler.query(queries[0]))
        await graph_rag_handler.setup_rag()
        papers_dict = [paper.model_dump() for paper in persona_kg_request.papers]
        await graph_rag_handler.add_papers(papers_dict)
        results = await graph_rag_handler.aretrieve_subgraph(queries[0])
        return {"queries": queries, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@baseRouter.post("/get_persona_desc_edits")
async def get_persona_desc_edits(request: Request, get_persona_desc_edits_request: GetPersonaDescEditsRequest):
    instruction = get_persona_desc_edits_request.instruction
    original_persona = get_persona_desc_edits_request.original_persona
    agent = PersonaAgent()
    suggested_changes = agent.generate_persona_desc_edits(instruction, original_persona['personaDescription'])
    return suggested_changes["edited_persona"]

@baseRouter.post("/get_paper2table_scheme")
def get_paper2table_scheme(request: Request, paper2table_scheme_request: Paper2TableSchemeRequest):
    agent = PersonaAgent()
    res = agent.generate_scheme_attribute_from_papers(paper2table_scheme_request.num_attributes, paper2table_scheme_request.papers)
    return {"scheme": res}

@baseRouter.post("/generate_table_from_papers")
def generate_table_from_papers(request: Request, generate_table_from_papers_request: GenerateTableFromPapersRequest):
    agent = PersonaAgent()
    res_scheme = agent.generate_scheme_attribute_from_papers(generate_table_from_papers_request.num_attributes, generate_table_from_papers_request.papers)
    common_column_names = {asp: res_scheme[asp] for asp in res_scheme["aspects_overview"]}
    res_table_values = agent.generate_table_values_from_papers(common_column_names, generate_table_from_papers_request.papers)
    for d in res_table_values:
        for key in d.keys():
            if d[key]:
                d[key]['persona'] = "common"

    # scan the scheme fields, and see if there is any columns that are all empty, if so, remove them
    all_keys = [key for key in res_table_values[0].keys()]
    for key in all_keys:
        if all(len(value) == 0 for value in [row[key] for row in res_table_values if key in row]):
            for row in res_table_values:
                del row[key]
    res_scheme.pop("aspects_overview")
    res_scheme = {k: {"column_names": v, "persona": "common"} for k, v in res_scheme.items()}

    # TODO: if personas are provided, generate additional attributes for the table based on each individual persona's expertise
    additional_column_names = {}
    additional_column_values = {}
    past_table_column_names = [item for sublist in [common_column_names[asp] for asp in common_column_names] for item in sublist]
    if generate_table_from_papers_request.personas:
        for persona in generate_table_from_papers_request.personas:
            additional_attributes = agent.generate_persona_additional_attributes(2, generate_table_from_papers_request.papers, persona['personaDescription'], past_table_column_names)
            column_names = {persona["name"]: {"column_names": additional_attributes, "persona": persona["name"]}}
            additional_column_names[persona["name"]] = column_names
            res_additional_table_values = agent.generate_persona_additional_column_values(column_names, generate_table_from_papers_request.papers, persona['personaDescription'])
            # scan the scheme fields, and see if there is any columns that are all empty, if so, remove them
            all_keys = [key for key in res_additional_table_values[0].keys()]
            for key in all_keys:
                if all(len(value) == 0 for value in [row[key] for row in res_additional_table_values if key in row]):
                    for row in res_additional_table_values:
                        del row[key]
            additional_column_values[persona["name"]] = res_additional_table_values
            for d in additional_column_values[persona["name"]]:
                for key in d.keys():
                    if d[key]:
                        d[key]['persona'] = persona["name"]
        # merge the additional column values with the original table values
        for persona in additional_column_names:
            res_scheme.update(additional_column_names[persona])
        for persona in additional_column_values:
            res_table_values = [res_table_values[i] | additional_column_values[persona][i] for i in range(len(res_table_values))]
    return {"scheme": res_scheme, "table_values": res_table_values, "additional_column_values": additional_column_values}

@baseRouter.post("/generate_table_from_dialogue_history")
def generate_table_from_dialogue_history(request: Request, generate_table_from_dialogue_history_request: GenerateTableFromDialogueHistoryRequest):
    agent = PersonaAgent()
    res = agent.generate_table_from_dialogue_history(generate_table_from_dialogue_history_request.dialogue_history, generate_table_from_dialogue_history_request.personas)
    return {"table_of_contents": res["table_of_contents"]}

# endpoints for multi-agent chat
@baseRouter.post("/chat/stream_response")
async def stream_response(request: Request, chat_request: ChatRequest, user_id: str = Depends(jwt_auth)):
    user_query = chat_request.user_query
    personas = chat_request.personas
    user_persona_id = chat_request.user_persona_id

    agent_group_chat = await get_session_agent_group_chat(request)
    if not agent_group_chat:
        agents = [create_agent_from_persona_chat(persona, graph_rag_working_dir=get_session_graphrag_working_dir(request), user_id=user_id) for persona in personas]
        termination_condition = MaxMessageTermination(6) | TextMentionTermination("TERMINATE")
        agent_group_chat = AgentGroupChat(agents, termination_condition)
        # save the agent_group_chat object to the session data
        set_agent_group_chat(get_session_id(request), agent_group_chat) 
    
    async def stream_chat_response_with_citation():
        async for message in agent_group_chat.run_chat_streaming(user_query):
            citations = parse_citations_from_message(message)
            res = {
                "chat_message": json.loads(message),
                "citations": [c.model_dump() for c in citations]
            }
            yield json.dumps(res) + "\n"
        
    return StreamingResponse(stream_chat_response_with_citation(), media_type="application/x-ndjson", headers={"X-Accel-Buffering": "no"})

@baseRouter.post("/chat/generate_personas_from_baseline_proposal")
async def generate_personas_from_baseline_proposal(request: Request, generate_personas_from_baseline_proposal_request: ForumThreadTopic):
    agent = PersonaAgent()
    topic_text = f"Topic: {generate_personas_from_baseline_proposal_request.topic}\nDescription: {generate_personas_from_baseline_proposal_request.topic_description}\n"
    res = agent.generate_personas(topic_text, "")
    personas = [formatting_personas_for_frontend(persona) for persona in res]
    return {"personas": personas}

@baseRouter.get("/chat/terminate")
async def terminate_chat(request: Request):
    """
    Check if a chat session exists, and if so, terminate it.s
    """
    agent_group_chat = await get_session_agent_group_chat(request)
    if agent_group_chat:
        agent_group_chat.set_manual_termination()
        return {"message": "Chat terminated"}
    else:
        raise HTTPException(status_code=501, detail="Chat session not found")
# endpoints for generating AI Persona questions suggestions
@baseRouter.post("/chat/generate_persona_questions_suggestions")
async def generate_persona_questions_suggestions(request: Request, generate_persona_questions_suggestions_request: GeneratePersonaQuestionsSuggestionsRequest):
    persona = generate_persona_questions_suggestions_request.persona
    topic = generate_persona_questions_suggestions_request.topic
    dialogue_history = generate_persona_questions_suggestions_request.dialogue_history
    agent = PersonaAgent()
    res = agent.generate_persona_questions_suggestions(persona, topic, dialogue_history)
    return {"questions": res}

# testing and debugging endpoints
@baseRouter.get("/testing/get_paper2table_scheme")
def get_paper2table_scheme(request: Request):
    dummy_num_attributes = 3
    dummy_papers = load_demo_papers()
    # validate dummy_papers into PaperInfo[]
    new_dummy_papers = []
    for paper in dummy_papers:
        new_dummy_papers.append(PaperInfo(**paper))
    new_dummy_papers = new_dummy_papers[:3]
    generate_table_from_papers_request = GenerateTableFromPapersRequest(num_attributes=dummy_num_attributes, papers=new_dummy_papers)
    res = generate_table_from_papers(request, generate_table_from_papers_request)
    return res
@baseRouter.get("/testing/get_paper2table_scheme_personas")
def get_paper2table_scheme_personas(request: Request):
    dummy_num_attributes = 3
    dummy_papers = load_demo_papers()
    # validate dummy_papers into PaperInfo[]
    new_dummy_papers = []
    for paper in dummy_papers:
        new_dummy_papers.append(PaperInfo(**paper))
    new_dummy_papers = new_dummy_papers[:3]
    generate_table_from_papers_request = GenerateTableFromPapersRequest(
        num_attributes=dummy_num_attributes, 
        papers=new_dummy_papers, 
        personas=load_demo_personas()[:2]
    )
    res = generate_table_from_papers(request, generate_table_from_papers_request)
    return res

# endpoints for multi-agent team chat
@baseRouter.get("/chat/testing/run_stream")
async def run_stream(request: Request, user_id: str = Depends(jwt_auth)):
    agent_group_chat = await get_session_agent_group_chat(request)
    if not agent_group_chat:
        agents = [
            create_agent("assistant1", user_id, "You are a helpful assistant."),
            create_agent("assistant2", user_id, "You are a helpful assistant.")
        ]
        termination_condition = MaxMessageTermination(10) | TextMentionTermination("TERMINATE")
        agent_group_chat = AgentGroupChat(agents, termination_condition)
        # save the agent_group_chat object to the session data
        set_agent_group_chat(get_session_id(request), agent_group_chat)
    
    task = "Tell me a one-liner joke."
    res = await agent_group_chat.run_chat(task)
    return {"messages": res}

@baseRouter.get("/chat/testing/send_manual_termination")
async def send_manual_termination(request: Request):
    agent_group_chat = await get_session_agent_group_chat(request)
    if not agent_group_chat:
        raise HTTPException(status_code=404, detail="Agent group chat not found")
    agent_group_chat.set_manual_termination()
    return {"message": "Manual termination sent"}

# testing endpoints for streaming chat responses
@baseRouter.get("/chat/testing/stream_response")
async def stream_response(request: Request, user_id: str = Depends(jwt_auth)):
    agent_group_chat = await get_session_agent_group_chat(request)
    if not agent_group_chat:
        agents = [
            create_agent("assistant1", user_id, "You are a helpful assistant."),
            create_agent("assistant2", user_id, "You are a helpful assistant.")
        ]
        termination_condition = MaxMessageTermination(20) | TextMentionTermination("TERMINATE")
        agent_group_chat = AgentGroupChat(agents, termination_condition)
        # save the agent_group_chat object to the session data
        set_agent_group_chat(get_session_id(request), agent_group_chat) 
    return StreamingResponse(agent_group_chat.run_chat_streaming("Tell me a one-liner joke."), media_type="application/json")

# Forum endpoints
## get dummy threads - now user specific
@baseRouter.get("/forum/testing/get_dummy_threads")
def get_dummy_threads(request: Request, user_id: str = Depends(jwt_auth)):
    # Get user-specific threads from the database
    user_threads = RDS_CLIENT.get_user_forum_threads(user_id)
    
    # If user has no threads, return dummy threads but don't save them
    if not user_threads:
        return {"threads": load_dummy_threads()}
    
    return {"threads": user_threads}

## endpoint for generating thread suggestions from a high-level idea
@baseRouter.post("/forum/testing/generate_thread_suggestions")
def generate_thread_suggestions(request: Request, generate_thread_suggestions_request: GenerateThreadSuggestionsRequest, user_id: str = Depends(jwt_auth)):
    high_level_idea = generate_thread_suggestions_request.high_level_idea
    agent = PersonaAgent()
    llm_res = agent.generate_thread_suggestions(high_level_idea)

    res = {
        "thread_suggestions": llm_res['sub_directions']
    }
    return res


## run a forum thread simulation from a given topic - now user specific
@baseRouter.post("/forum/testing/create_new_thread")
async def create_new_thread(request: Request, create_new_thread_request: CreateNewThreadRequest, user_id: str = Depends(jwt_auth)):
    topic = create_new_thread_request.topic
    discussion_thread = DiscussionThreadManager(topic.topic, topic.topic_description)

    # Store the initial thread in the database
    RDS_CLIENT.save_user_forum_thread(
        user_id=user_id, 
        thread_id=discussion_thread.thread_id,
        thread_data=discussion_thread.to_dict()
    )

    async def safe_run_forum_thread_simulation():
        try:
            async for item in run_forum_thread_simulation(topic.topic, topic.topic_description, user_id, discussion_thread):
                # Update the thread in the database after each step
                RDS_CLIENT.update_user_forum_thread(
                    user_id=user_id,
                    thread_id=discussion_thread.thread_id,
                    thread_data=discussion_thread.to_dict()
                )
                # Yield the data chunk and a flush marker to ensure immediate sending
                yield item
                yield b''  # Empty bytes forces a flush in many ASGI servers
        except Exception as e:
            # Yield a JSON error message so that the client can receive that information.
            error_msg = json.dumps({"type": "ERROR", "body": {"thread_id": discussion_thread.thread_id, "message": str(e)}}) + "\n"
            yield error_msg
            yield b''  # Flush the error immediately
    
    return StreamingResponse(
        safe_run_forum_thread_simulation(), 
        media_type="application/x-ndjson",
        headers={"X-Accel-Buffering": "no"}  # Disable Nginx buffering if you're using it
    )

## request a respond from a specific agent - now user specific
@baseRouter.post("/forum/testing/request_agent_response")
async def request_agent_response(request: Request, request_agent_response_request: RequestAgentResponseRequest, user_id: str = Depends(jwt_auth)):
    agent_name = request_agent_response_request.agent_name
    message = request_agent_response_request.message
    action = request_agent_response_request.action
    discussion_thread_data = request_agent_response_request.discussion_thread
    
    # Check if the thread belongs to the user
    thread_data = RDS_CLIENT.get_user_forum_thread(user_id, discussion_thread_data.discussion.id)
    if not thread_data:
        raise HTTPException(status_code=404, detail="Thread not found for this user")
    
    discussion_thread = DiscussionThreadManager(topic=discussion_thread_data.discussion.topic, topic_description=discussion_thread_data.discussion.topic_description)
    discussion_thread.load_thread_from_pydantic(discussion_thread_data)
    
    agent_response = await get_agent_response(agent_name, message, action, user_id, discussion_thread)
    
    # Update the thread with the new response
    RDS_CLIENT.update_user_forum_thread(
        user_id=user_id,
        thread_id=discussion_thread.thread_id,
        thread_data=discussion_thread.to_dict()
    )
    
    return {"agent_response": agent_response}

## endpoint for getting the catalog of agents - now includes user-specific agent settings
@baseRouter.get("/forum/testing/get_agent_catalog")
def get_agent_catalog(request: Request, user_id: str = Depends(jwt_auth)):
    working_dir = os.path.join(app_settings.lightrag_working_dir, user_id)
    agent_folders = glob.glob(f"{working_dir}/*")
    agent_names = [os.path.basename(folder) for folder in agent_folders]
    agent_catalog = []
    
    # Get user-specific agent settings
    user_agent_settings = RDS_CLIENT.get_user_agent_settings(user_id)
    
    for agent_name in agent_names:
        agent_folder = os.path.join(working_dir, agent_name, "default")
        # if paper_id.json exists, then the agent has papers
        if os.path.exists(os.path.join(agent_folder, "paper_ids.json")):
            with open(os.path.join(agent_folder, "paper_ids.json"), "r") as f:
                paper_ids: List[str] = json.load(f)
        else:
            paper_ids = []
        
        # Include user-specific settings if they exist
        settings = user_agent_settings.get(agent_name, {}) if user_agent_settings else {}
        
        agent_info = AgentInfo(name=agent_name, paper_ids=paper_ids)
        agent_catalog.append({**agent_info.dict(), "settings": settings})
    
    return {"agent_catalog": agent_catalog}

## endpoint for getting the persona profile of an agent
@baseRouter.post("/forum/testing/get_persona_profile")
def get_persona_profile(request: Request, get_persona_profile_request: GetPersonaProfileRequest, user_id: str = Depends(jwt_auth)):
    agent_name = get_persona_profile_request.agent_name
    persona_profile = load_persona_profile(agent_name, user_id)
    
    # Get user-specific agent settings
    settings = RDS_CLIENT.get_user_agent_settings(user_id, agent_name)
    
    # Add user-specific settings to the profile if they exist
    if settings:
        persona_profile["settings"] = settings
    
    return {"persona_profile": persona_profile}

## endpoint for getting the literature of a persona
@baseRouter.post("/forum/testing/get_persona_literature")
def get_persona_literature(request: Request, get_persona_literature_request: GetPersonaLiteratureRequest, user_id: str = Depends(jwt_auth)):
    agent_name = get_persona_literature_request.agent_name
    # replace "_" with " "
    agent_name = agent_name.replace("_", " ")
    agent_folder = os.path.join(app_settings.lightrag_working_dir, user_id, agent_name, "default")
    # check if paper_ids.json exists, if not return an empty list
    if not os.path.exists(os.path.join(agent_folder, "paper_ids.json")):
        return {"literature": []}
    with open(os.path.join(agent_folder, "paper_ids.json"), "r") as f:
        paper_ids: List[str] = json.load(f)
    # get the papers from the paper_ids
    if len(paper_ids) == 0:
        return {"literature": []}
    papers = retrieve_papers_by_ids(paper_ids)
    return {"literature": papers}

## endpoint for saving user-specific agent settings
@baseRouter.post("/forum/testing/save_agent_settings")
def save_agent_settings(request: Request, agent_name: str, settings: dict, user_id: str = Depends(jwt_auth)):
    success = RDS_CLIENT.save_user_agent_settings(user_id, agent_name, settings)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save agent settings")
    return {"message": "Settings saved successfully"}

## endpoint for deleting a forum thread
@baseRouter.delete("/forum/testing/delete_thread/{thread_id}")
def delete_thread(request: Request, thread_id: str, user_id: str = Depends(jwt_auth)):
    success = RDS_CLIENT.delete_user_forum_thread(user_id, thread_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete thread")
    return {"message": "Thread deleted successfully"}

## endpoint for toggling favorite status of a thread
@baseRouter.post("/forum/testing/toggle_favorite/{thread_id}")
def toggle_favorite(request: Request, thread_id: str, is_favorited: bool = None, user_id: str = Depends(jwt_auth)):
    success = RDS_CLIENT.toggle_favorite_thread(user_id, thread_id, is_favorited)
    if not success:
        raise HTTPException(status_code=404, detail="Thread not found or failed to update")
    return {"message": "Thread favorite status updated successfully"}

## endpoint for getting favorite threads
@baseRouter.get("/forum/testing/favorite_threads")
def get_favorite_threads(request: Request, user_id: str = Depends(jwt_auth)):
    threads = RDS_CLIENT.get_favorite_threads(user_id)
    return {"threads": threads}

## endpoint for favoriting/unfavoriting a post or reply
@baseRouter.post("/forum/testing/toggle_favorite_post")
def toggle_favorite_post(
    request: Request, 
    toggle_request: ToggleFavoritePostRequest,
    user_id: str = Depends(jwt_auth)
):
    success = RDS_CLIENT.toggle_favorite_post(user_id, toggle_request.thread_id, toggle_request.post_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to toggle favorite status")
    return {"message": "Post favorite status toggled successfully"}

## endpoint for getting all favorited posts by a user
@baseRouter.get("/forum/testing/favorited_posts")
def get_favorited_posts(
    request: Request, 
    thread_id: str = Query(None, description="Optional thread ID to filter favorites by thread"),
    user_id: str = Depends(jwt_auth)
):
    post_ids = RDS_CLIENT.get_favorited_posts(user_id, thread_id)
    return {"favorited_post_ids": post_ids}

## endpoint for getting all favorited posts by thread
@baseRouter.get("/forum/testing/favorited_posts_by_thread")
def get_favorited_posts_by_thread(request: Request, user_id: str = Depends(jwt_auth)):
    posts_by_thread = RDS_CLIENT.get_favorited_posts_by_thread(user_id)
    return {"favorited_posts_by_thread": posts_by_thread}

## endpoint for getting a list of actions each agent can take
@baseRouter.get("/forum/testing/get_agent_actions")
def get_agent_actions(request: Request, user_id: str = Depends(jwt_auth)):
    return {"agent_actions": [{
        "action": "Question",
        "description": "To ask a question following up the message."
    }, {
        "action": "Agree",
        "description": "To make a point in agreement with the message."
    }, {
        "action": "Disagree",
        "description": "To make a point in disagreement with the message."
    }]}

## endpoint for getting the persona profile template
@baseRouter.get("/forum/testing/get_persona_profile_template")
def get_persona_profile_template(request: Request, user_id: str = Depends(jwt_auth)):
    return {"persona_profile_template": get_default_persona_template()}

## endpoint for getting the full persona profile template
@baseRouter.get("/forum/testing/get_full_persona_profile_template")
def get_full_persona_profile_template(request: Request, user_id: str = Depends(jwt_auth)):
    return {"persona_profile_template": get_full_persona_template()}

## endpoint for listing all agents with memories
@baseRouter.get("/forum/testing/list_agents_with_memories")
def list_agents_with_memories(request: Request, user_id: str = Depends(jwt_auth)):
    """
    List all agents that have stored memory snippets for the authenticated user.
    
    This endpoint returns a list of agent IDs that have at least one memory snippet
    associated with the authenticated user. These agent IDs can then be used with
    the get_agent_memories endpoint to retrieve the actual memory snippets.
    
    Returns:
        A JSON object with an "agents" field containing a list of agent IDs.
    """
    agent_ids = list_user_agents_with_memories(user_id)
    return {"agents": agent_ids}

## endpoint for getting agent memories
@baseRouter.post("/forum/testing/get_agent_memories")
def get_agent_memories(request: Request, get_agent_memories_request: GetAgentMemoriesRequest, user_id: str = Depends(jwt_auth)):
    """
    Retrieve memory snippets for a specific agent from the user's perspective.
    
    This endpoint returns a list of research idea snippets that were extracted
    from the agent's thought process during discussions. These snippets represent
    the agent's internal thoughts, insights, and ideas related to the research topics
    being discussed.
    
    Request Body:
        - agent_id: The ID of the agent whose memories to retrieve
    
    Returns:
        A JSON object with a "memories" field containing a list of memory snippets,
        each with the actual snippet text and a relevance score.
    """
    agent_id = get_agent_memories_request.agent_id.replace(" ", "_")
    memories = memory_reader(user_id, agent_id)
    
    # Format memories for the response
    formatted_memories = []
    for memory in memories:
        formatted_memories.append({
            "id": memory.value['content']['id'],
            "title": memory.value['content']['title'],
            "snippet": memory.value['content']['snippet'],
            "parent_id": memory.value['content']['parent_id']
        })
    
    return {"memories": formatted_memories}

# endpoints for logging (json data: {type: str, log_body: dict}})
@baseRouter.post("/log/save")
async def log_data(logData: LogData, request: Request):
    sid = get_session_id(request)
    log_type, log_body, user = logData.type, logData.log_body, logData.user

    # load log_body from json string
    log_body = json.loads(log_body)

    RDS_CLIENT.write_log(sid, log_type, log_body, user)

@baseRouter.post("/log/user_study")
async def log_user_study_data(logData: UserStudyLogData, request: Request):
    """
    Save user study log data to the database.
    
    This endpoint is always available, but adds an is_user_study field
    to indicate when USER_STUDY_MODE is enabled.
    """
    sid = get_session_id(request)
    user_id, log_type, log_data, timestamp = logData.user_id, logData.log_type, logData.log_data, logData.timestamp
    
    # Add is_user_study field to log_data when USER_STUDY_MODE is true
    if app_settings.user_study_mode:
        if isinstance(log_data, dict):
            log_data["is_user_study"] = True
    
    success = RDS_CLIENT.save_user_study_log(user_id, sid, log_type, log_data, timestamp)
    
    return {"status": "success" if success else "error"}

@baseRouter.get("/log/user_study/{user_id}")
async def get_user_study_logs(
    request: Request, 
    user_id: str, 
    session_id: str = Query(None),
    log_type: str = Query(None),
    start_time: str = Query(None),
    end_time: str = Query(None),
    limit: int = Query(100)
):
    """
    Get user study logs for a specific user with optional filtering.
    
    This endpoint is always available and can be used to retrieve logs
    whether user study mode is enabled or not.
    """
    logs = RDS_CLIENT.get_user_study_logs(
        user_id=user_id,
        session_id=session_id,
        log_type=log_type,
        start_time=start_time,
        end_time=end_time,
        limit=limit
    )
    
    return {"logs": logs}

@baseRouter.get("/log/check_session_id")
async def check_session_id(request: Request):
    return {"session_id": get_session_id(request)}

@baseRouter.post("/forum/testing/generate_project_summary")
async def generate_project_summary(
    request: Request, 
    generate_project_summary_request: GenerateProjectSummaryRequest,
    user_id: str = Depends(jwt_auth)
):
    """Generate a comprehensive project summary report from a project's forum threads and posts."""
    thread_ids = generate_project_summary_request.thread_ids
    only_favorites = generate_project_summary_request.only_favorites
    
    # 1. Get all threads for the project
    threads = RDS_CLIENT.get_user_forum_threads(user_id)
    project_threads = [thread for thread in threads if thread.get("id", "") in thread_ids]
    
    # 2. Get favorited posts if filtering by favorites
    favorited_posts_by_thread = []
    if only_favorites:
        favorited_posts_by_thread = RDS_CLIENT.get_favorited_posts_by_thread(user_id)
    
    # 3. Process threads and format them for the prompt
    discussion_threads = []
    for thread_data in project_threads:
        thread = DiscussionThreadManager.from_dict(thread_data)
        
        # If only favorites is True, filter posts to only include favorited ones
        if only_favorites:
            # Find favorited posts for this thread
            favorited_post_ids = []
            for item in favorited_posts_by_thread:
                for post in item['posts']:
                    post_id = post.get("post_id")
                    if post_id in [post['message'].get("id") for post in thread.get_all_posts()]:
                        favorited_post_ids.append(post_id)
                        break

            # Filter posts that are favorited
            filtered_posts = []
            for post in thread.get_all_posts():
                if post['message'].get("id") in favorited_post_ids:
                    filtered_posts.append(post)
            
            # Only include thread if it has favorited posts
            if filtered_posts:
                thread_info = thread.to_dict()
                discussion_threads.append(thread_info)
        else:
            # Include all posts
            discussion_threads.append(thread.to_dict())
    
    
    persona_agent = PersonaAgent()
    try:
        response = persona_agent.generate_project_summary_report(discussion_threads, favorited_posts_by_thread)
    except Exception as e:
        return {"error": str(e)}
    
    return response
