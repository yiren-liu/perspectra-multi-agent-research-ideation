from typing import List
from pydantic import BaseModel, SecretStr

from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langchain_core.output_parsers import JsonOutputParser, PydanticOutputParser
from langchain_core.prompts import PromptTemplate

from autogen_core.tools import FunctionTool

from app.chains.graph_rag import GraphRAGHandler
from app.agents.utils import search_paper_by_query
from settings import app_settings

class PaperIds(BaseModel):
    paper_ids: List[str]
    summary: str
def create_graph_rag_search_tool(graph_rag_handler: GraphRAGHandler) -> FunctionTool:
    async def search_graph_rag(query: str):
        return await graph_rag_handler.aquery_context_only(query)

    return FunctionTool(
        name="search_graph_rag",
        description="""Search a graph RAG database for a collection of relevant papers/publications. 
The query will return a list of entities-relationships that are concepts and mentions in the papers, and also the source text snippets from the papers.
The query should be a concise and specific question that can be answered using the information from the title and abstract of papers.""",
        func=search_graph_rag,
    )

def create_search_semantic_scholar_for_papers_tool():
    return FunctionTool(
        name="search_semantic_scholar_for_papers",
        description="""Search for papers in Semantic Scholar using a query.
The query will return a list of papers that are relevant to the query.
The query should be a concise and specific keyword/phrase for Semantic Scholar search engine.""",
        func=search_paper_by_query,
    )

def create_add_paper_to_graph_rag_tool(graph_rag_handler: GraphRAGHandler):
    async def add_paper_to_graph_rag_async(paper_id: str):
        return await graph_rag_handler.add_papers(paper_id)

    return FunctionTool(
        name="add_paper_to_graph_rag",
        description="Add a paper to the graph RAG database.",
        func=add_paper_to_graph_rag_async,
    )


def create_literature_review_tool(graph_rag_handler: GraphRAGHandler) -> FunctionTool:
    async def literature_review(query: str, relevancy_criteria: str):
        # TODO: implement the literature review tool
        # 1. search for papers in Semantic Scholar using a query
        # 2. use a LLM inference to determine which of the papers are relevant and needed to be added to the graph RAG
        # 3. add the relevant papers to the graph RAG
        # 4. return a summary of the added papers
        papers = search_paper_by_query(query)

        if app_settings.openai_api_type == "openai":
            llm = ChatOpenAI(
                api_key=SecretStr(app_settings.openai_api_key) if app_settings.openai_api_key else None,
                base_url=app_settings.openai_api_base,
                model=app_settings.openai_model,
                # temperature=0.5,
            )
        elif app_settings.openai_api_type == "azure":
            llm = AzureChatOpenAI(
                api_key=SecretStr(app_settings.openai_api_key) if app_settings.openai_api_key else None,
                azure_endpoint=app_settings.openai_api_base,
                api_version=app_settings.openai_api_version,
                azure_deployment=app_settings.openai_model,
                # temperature=0.5,
            )

        prompt = PromptTemplate.from_template(
            """You are a helpful research assistant that helps users to perform a literature review.
You have done a preliminary search for papers in Semantic Scholar, and found the following papers:
<papers>
{papers}
</papers>

Please review the papers and determine which of the papers are relevant to the user's query.
The relevancy criteria is: 
<criteria>
{relevancy_criteria}
</criteria>
Also, select higher quality papers, and do not select papers that do not have a title or abstract.

Now return a list of paper IDs that are relevant to the user's query, which will be later added to a knowledge base and used for downstream tasks.
You also need to return a summary of the added papers.
Your response should be a JSON object with the following fields:
- paper_ids: a list of paper IDs that are relevant to the user's query
- summary: a narrative summary of the added papers (100 words). When referring to the papers, you should use the paper_ids instead of the paper titles.
    - Example: "The selected papers explore CRISPR multi-gene editing strategies, computational tools, and ethical considerations. <paper_id>266735baf0cbd4c82793a60f263f9f152e84237b</paper_id> discusses Python-based computational approaches to enhance CRISPR-Cas9 precision and efficiency ..."
"""
        )
        parser = PydanticOutputParser(pydantic_object=PaperIds)
        chain = prompt | llm | parser

        result: PaperIds = chain.invoke({"papers": papers, "relevancy_criteria": relevancy_criteria})
        paper_ids = result.paper_ids
        summary = result.summary

        filtered_papers = [paper.model_dump() for paper in papers if paper.id in paper_ids]
        await graph_rag_handler.add_papers(filtered_papers)
        return f"Added {len(filtered_papers)} papers to the graph RAG. Summary of the added papers: {summary}"

    return FunctionTool(
        name="literature_review",
        description="""Perform a literature review on a list of papers and return a list of paper IDs that are relevant to the user's query. Also return a summary of the added papers.

Args:
 - query: a concise and specific keyword/phrase for Semantic Scholar search engine.
 - relevancy_criteria: a criteria for determining which papers are relevant to the user's query.
""",
        func=literature_review,
    )
