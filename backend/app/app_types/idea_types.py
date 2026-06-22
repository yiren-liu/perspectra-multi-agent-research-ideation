from pydantic import BaseModel
from typing import List, Optional, Dict

class Idea(BaseModel):
    motivation: Optional[str]
    novelty: Optional[str]
    method: Optional[str]

class Ideas(BaseModel):
    ideas: List[Idea]

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

class SearchQuery(BaseModel):
    search_query: str
    sub_queries: List[dict]

class JudgeIdeaAllOutput(BaseModel):
    thinking_process: str
    choice: Dict[str, int]