import logging
logging.basicConfig(level=logging.INFO)

import os
import uuid
import shutil
import json
import copy
import secrets
from typing import List

import numpy as np

from fastapi import FastAPI, Depends, HTTPException, status, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi import Body



from starlette.requests import Request
from starlette.middleware.sessions import SessionMiddleware

from routers.base import baseRouter
from routers.tasks import tasksRouter

from app.chains.custom_openai_exception import CustomOpenAIException
from settings import app_settings

logger = logging.getLogger(__name__)

HTTP_USER_ERROR = 491

app = FastAPI()
app.include_router(baseRouter, prefix="/api/v1", tags=["api/v1"])
app.include_router(tasksRouter, prefix="/api/v1/tasks", tags=["tasks"])

# Allowed CORS origins, configured via the ALLOWED_ORIGINS env var (comma-separated).
origins = [origin.strip() for origin in app_settings.allowed_origins.split(",") if origin.strip()]

# Session signing key. Set SESSION_SECRET_KEY in the environment for stable sessions
# across restarts and worker processes; otherwise an ephemeral key is generated.
session_secret_key = app_settings.session_secret_key
if not session_secret_key:
    logger.warning(
        "SESSION_SECRET_KEY is not set; generating an ephemeral key. "
        "Sessions will not persist across restarts or multiple workers."
    )
    session_secret_key = secrets.token_urlsafe(32)

app.add_middleware(SessionMiddleware, secret_key=session_secret_key)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    exc_str = f'{exc}'.replace('\n', ' ').replace('   ', ' ')
    logging.error(f"{request}: {exc_str}")
    content = {'status_code': 10422, 'message': exc_str, 'data': None}
    return JSONResponse(content=content, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)

@app.exception_handler(CustomOpenAIException)
async def openai_exception_handler(request: Request, exc: CustomOpenAIException):
    content = {'error_type': str(exc.args[0])[8:-2], 'message': exc.args[1]}
    return JSONResponse(content=content, status_code = HTTP_USER_ERROR)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app", host="0.0.0.0", port=8321, 
        workers=1, 
        loop="asyncio",
        log_level="info",
        # reload=True, 
    )
