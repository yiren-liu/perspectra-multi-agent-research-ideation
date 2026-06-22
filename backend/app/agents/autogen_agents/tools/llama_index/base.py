import nest_asyncio
nest_asyncio.apply()

from llama_index.core.tools import FunctionTool

from app.chains.graph_rag import GraphRAGHandler

def create_graph_rag_search_tool(graph_rag_handler: GraphRAGHandler) -> FunctionTool:
    async def search_paper_database(query: str):
        """Search a graph RAG database for a collection of relevant papers/publications. 
        The query will return a list of entities-relationships that are concepts and mentions in the papers, and also the source text snippets from the papers.
        The query should be a concise and specific question that can be answered using the information from the title and abstract of papers.
        Args:
            query: str (The query to search the paper database with, could be keywords or statements)
        """
        return await graph_rag_handler.aquery_context_only(query)
    return FunctionTool.from_defaults(async_fn=search_paper_database)