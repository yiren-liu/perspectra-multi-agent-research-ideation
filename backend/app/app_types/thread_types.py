from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field

class Message(BaseModel):
    id: str
    author: str
    chosen_action: str
    reason: str
    content: str
    multi_level_summary: Optional[MultiLevelSummary] = None

class DiscussionEntry(BaseModel):
    message: Message
    # Use a default_factory to ensure an empty list if no replies are provided.
    replies: List[DiscussionEntry] = Field(default_factory=list)

class Discussion(BaseModel):
    id: str
    topic: str
    topic_description: str
    discussion_thread: List[DiscussionEntry] = Field(default_factory=list)

class Citation(BaseModel):
    paper_id: str
    title: str
    abstract: str
    authors: List[str]
    year: int

class MultiLevelSummary(BaseModel):
    keywords: List[str]
    short_summary: str
    long_summary: str

class DiscussionThread(BaseModel):
    discussion: Discussion
    citations: List[Citation] = Field(default_factory=list)

DiscussionEntry.model_rebuild()
