import asyncio
import json
import logging
import uuid
import os
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, Depends, Request, WebSocket
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth.jwt_auth import jwt_auth
from app.chains.graph_rag import GraphRAGHandler
from settings import app_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

tasksRouter = APIRouter()

# Store active task progress streams
active_tasks = {}

class TaskProgressRequest(BaseModel):
    task_id: str
    task_name: str
    task_type: str
    papers: Optional[List[Dict[str, Any]]] = None
    # Additional fields can be added based on task type

class TaskProgress(BaseModel):
    task_id: str
    task_name: str
    status: str = "pending"
    progress: int = 0
    message: Optional[str] = None

def get_session_id(request: Request) -> str:
    request.session["session_id"] = request.session.get("session_id")
    session_id = request.session["session_id"]

    if session_id is None:
        session_id = str(uuid.uuid4())
        request.session["session_id"] = session_id
    return session_id

def get_session_graphrag_working_dir(request: Request) -> str:
    return f"./temp/lightrag/{get_session_id(request)}"

@tasksRouter.post("/stream_progress")
async def stream_task_progress(request: Request, task_req: TaskProgressRequest, user_id: str = Depends(jwt_auth)):
    """
    Stream progress updates for a long-running task.
    This endpoint initiates the task and then streams progress updates.
    """
    task_id = task_req.task_id
    task_queue = asyncio.Queue()
    active_tasks[task_id] = task_queue
    
    # Process based on task type
    if task_req.task_type == "add_papers":
        # Start the task in the background
        asyncio.create_task(process_add_papers_task(
            task_id, 
            task_req.task_name, 
            task_req.papers or [], 
            task_queue,
            get_session_graphrag_working_dir(request),
            user_id
        ))
    
    async def stream_progress():
        try:
            # Initial update
            yield json.dumps({
                "type": "PROGRESS_UPDATE",
                "data": {
                    "task_id": task_id,
                    "task_name": task_req.task_name,
                    "status": "pending",
                    "progress": 0,
                    "message": "Starting task..."
                }
            }) + "\n"
            
            # Stream progress updates
            while True:
                try:
                    update = await asyncio.wait_for(task_queue.get(), timeout=60.0)
                    if update is None:  # None is our signal to end the stream
                        break
                    
                    yield json.dumps({
                        "type": "PROGRESS_UPDATE",
                        "data": update
                    }) + "\n"
                    
                    # If task is completed or errored, end the stream
                    if update["status"] in ["completed", "error"]:
                        break
                        
                except asyncio.TimeoutError:
                    # Send a keep-alive message
                    yield json.dumps({"type": "KEEP_ALIVE"}) + "\n"
                except Exception as e:
                    logger.error(f"Error in stream_progress: {str(e)}")
                    yield json.dumps({
                        "type": "ERROR",
                        "data": {"message": f"Stream error: {str(e)}"}
                    }) + "\n"
                    break
        finally:
            # Clean up
            if task_id in active_tasks:
                del active_tasks[task_id]
    
    return StreamingResponse(
        stream_progress(),
        media_type="application/x-ndjson",
        headers={"X-Accel-Buffering": "no"}
    )

async def process_add_papers_task(task_id: str, task_name: str, papers: List[Dict[str, Any]], queue: asyncio.Queue, working_dir: str, user_id: str):
    """Process the add_papers task using the GraphRAGHandler."""
    try:
        # Initialize the task with running status
        await queue.put({
            "task_id": task_id,
            "task_name": task_name,
            "status": "running",
            "progress": 5,
            "message": "Initializing RAG system..."
        })
        
        # Create agent_folder path
        agent_folder = os.path.dirname(working_dir)
        os.makedirs(agent_folder, exist_ok=True)
        
        # Initialize GraphRAGHandler
        graph_rag_handler = GraphRAGHandler(working_dir)
        await graph_rag_handler.setup_rag()
        
        # Create a wrapper for progress updates
        async def progress_wrapper(update):
            # Add task ID and name to each update
            update["task_id"] = task_id
            update["task_name"] = task_name
            await queue.put(update)
        
        # Add papers with progress updates
        await graph_rag_handler.add_papers(papers, queue=queue)
        
    except Exception as e:
        logger.error(f"Error processing add_papers task: {str(e)}")
        await queue.put({
            "task_id": task_id,
            "task_name": task_name,
            "status": "error",
            "progress": 0,
            "message": f"Error: {str(e)}"
        })
    finally:
        # Signal the end of updates
        await queue.put(None)

@tasksRouter.post("/test_progress")
async def test_task_progress(request: Request, user_id: str = Depends(jwt_auth)):
    """
    Test endpoint that simulates a task with progress updates.
    This is for demonstration purposes only.
    """
    task_id = f"test-task-{uuid.uuid4()}"
    task_queue = asyncio.Queue()
    active_tasks[task_id] = task_queue
    
    # Start the demo task in the background
    asyncio.create_task(process_demo_task(task_id, "Demo Task", task_queue))
    
    async def stream_progress():
        try:
            # Initial update
            yield json.dumps({
                "type": "PROGRESS_UPDATE",
                "data": {
                    "task_id": task_id,
                    "task_name": "Demo Task",
                    "status": "pending",
                    "progress": 0,
                    "message": "Starting demo task..."
                }
            }) + "\n"
            
            # Stream progress updates
            while True:
                try:
                    update = await asyncio.wait_for(task_queue.get(), timeout=60.0)
                    if update is None:  # None is our signal to end the stream
                        break
                    
                    yield json.dumps({
                        "type": "PROGRESS_UPDATE",
                        "data": update
                    }) + "\n"
                    
                    # If task is completed or errored, end the stream
                    if update["status"] in ["completed", "error"]:
                        break
                        
                except asyncio.TimeoutError:
                    # Send a keep-alive message
                    yield json.dumps({"type": "KEEP_ALIVE"}) + "\n"
                except Exception as e:
                    logger.error(f"Error in stream_progress: {str(e)}")
                    yield json.dumps({
                        "type": "ERROR",
                        "data": {"message": f"Stream error: {str(e)}"}
                    }) + "\n"
                    break
        finally:
            # Clean up
            if task_id in active_tasks:
                del active_tasks[task_id]
    
    return StreamingResponse(
        stream_progress(),
        media_type="application/x-ndjson",
        headers={"X-Accel-Buffering": "no"}
    )

async def process_demo_task(task_id: str, task_name: str, queue: asyncio.Queue):
    """Process a demo task with simulated progress updates."""
    try:
        steps = [
            {"status": "running", "progress": 10, "message": "Initializing task..."},
            {"status": "running", "progress": 20, "message": "Loading resources..."},
            {"status": "running", "progress": 30, "message": "Processing data (phase 1)..."},
            {"status": "running", "progress": 50, "message": "Processing data (phase 2)..."},
            {"status": "running", "progress": 70, "message": "Finalizing results..."},
            {"status": "running", "progress": 90, "message": "Wrapping up..."},
            {"status": "completed", "progress": 100, "message": "Task completed successfully!"}
        ]
        
        for step in steps:
            # Add task ID and name to each update
            update = {
                "task_id": task_id,
                "task_name": task_name,
                **step
            }
            await queue.put(update)
            
            # Simulate processing time
            await asyncio.sleep(1.5)  # Adjust for desired demo speed
            
    except Exception as e:
        logger.error(f"Error processing demo task: {str(e)}")
        await queue.put({
            "task_id": task_id,
            "task_name": task_name,
            "status": "error",
            "progress": 0,
            "message": f"Error: {str(e)}"
        })
    finally:
        # Signal the end of updates
        await queue.put(None) 