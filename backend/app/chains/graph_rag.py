import os
import asyncio
import numpy as np
import json

from lightrag import LightRAG, QueryParam
from lightrag.llm.openai import openai_complete, openai_embed
from lightrag.llm.azure_openai import azure_openai_complete, azure_openai_embed
from lightrag.utils import EmbeddingFunc
from lightrag.kg.shared_storage import initialize_pipeline_status

from app.chains import DUMMY_DATA
from settings import app_settings
from db_utils import Singleton

import logging
logger = logging.getLogger(__name__)

WORKING_DIR = "./temp"

# Store active task progress queues
active_tasks = {}

class GraphRAGHandler:
    def __init__(self, working_dir=WORKING_DIR, top_k=30, max_token_for_text_unit=2000, max_token_for_global_context=2000, max_token_for_local_context=2000):
        self.top_k = top_k
        self.max_token_for_text_unit = max_token_for_text_unit
        self.max_token_for_global_context = max_token_for_global_context
        self.max_token_for_local_context = max_token_for_local_context
        self.working_dir = working_dir
        if not os.path.exists(self.working_dir):
            os.makedirs(self.working_dir)
        self.rag = None
        self.paper_ids = set()
        paper_ids_file = os.path.join(self.working_dir, 'paper_ids.json')
        if os.path.exists(paper_ids_file):
            with open(paper_ids_file, 'r') as f:
                self.paper_ids = set(json.load(f))
        else:
            logger.info("No paper IDs file found. Creating a new one.")
            with open(paper_ids_file, 'w') as f:
                json.dump([], f)

    async def llm_model_func(self, prompt, system_prompt=None, history_messages=[], **kwargs) -> str:
        if app_settings.openai_api_type == "openai":
            return await openai_complete(
                # "gpt-4o",
                prompt,
                system_prompt=system_prompt,
                history_messages=history_messages,
                api_key=app_settings.openai_api_key,
                base_url=app_settings.openai_api_base,
                **kwargs,
            )
        elif app_settings.openai_api_type == "azure":
            return await azure_openai_complete(
                # "gpt-4o",
                prompt,
                system_prompt=system_prompt,
                history_messages=history_messages,
                api_key=app_settings.openai_api_key,
                base_url=app_settings.openai_api_base,
                api_version=app_settings.openai_api_version,
                **kwargs,
            )

    async def embedding_func(self, texts: list[str]) -> np.ndarray:
        if app_settings.openai_api_type == "openai":
            return await openai_embed(
                texts,
                model="text-embedding-3-small",
                api_key=app_settings.openai_api_key,
                base_url=app_settings.openai_api_base,
            )
        elif app_settings.openai_api_type == "azure":
            return await azure_openai_embed(
                texts,
                model="text-embedding-3-small",
                api_key=app_settings.openai_api_key,
                base_url=app_settings.openai_api_base,
                api_version=app_settings.openai_api_version,
            )

    async def get_embedding_dim(self):
        test_text = ["This is a test sentence."]
        embedding = await self.embedding_func(test_text)
        embedding_dim = embedding.shape[1]
        return embedding_dim

    async def setup_rag(self):
        embedding_dimension = await self.get_embedding_dim()
        self.rag = LightRAG(
            working_dir=self.working_dir,
            llm_model_func=self.llm_model_func,
            embedding_func=EmbeddingFunc(
                embedding_dim=embedding_dimension,
                max_token_size=8192,
                func=self.embedding_func,
            ),
        )
        await self.rag.initialize_storages()
        await initialize_pipeline_status()

    async def insert_texts(self, texts):
        if self.rag is None:
            await self.setup_rag()
        await self.rag.ainsert(texts)

    async def aquery(self, query_text: str, mode: str = "hybrid"):
        if self.rag is None:
            await self.setup_rag()
        return await self.rag.aquery(query_text, param=QueryParam(
            mode=mode, 
            top_k=self.top_k, 
            max_token_for_text_unit=self.max_token_for_text_unit, 
            max_token_for_global_context=self.max_token_for_global_context, 
            max_token_for_local_context=self.max_token_for_local_context
        ))

    async def aquery_context_only(self, query_text: str, mode: str = "hybrid"):
        if self.rag is None:
            await self.setup_rag()
        return await self.rag.aquery(query_text, param=QueryParam(
            mode=mode, 
            only_need_context=True, 
            max_token_for_text_unit=self.max_token_for_text_unit, 
            max_token_for_global_context=self.max_token_for_global_context, 
            max_token_for_local_context=self.max_token_for_local_context
        ))

    async def aretrieve_subgraph(self, query_text: str, mode: str = "hybrid"):
        if self.rag is None:
            await self.setup_rag()
        return await self.rag.aquery_subgraph(query_text, param=QueryParam(
            mode=mode, 
            top_k=self.top_k, 
            max_token_for_text_unit=self.max_token_for_text_unit, 
            max_token_for_global_context=self.max_token_for_global_context, 
            max_token_for_local_context=self.max_token_for_local_context
        ))

    async def add_papers(self, papers, task_queue=None):
        """
        Add papers to the RAG system.
        If task_queue is provided, progress updates will be sent to it.
        
        Args:
            papers: List of paper objects to add
            task_queue: Optional asyncio.Queue to send progress updates
        """
        # Format and add papers, preventing duplicates
        new_texts = []
        for paper in papers:
            paper_id = paper.get('id')
            if paper_id and paper_id not in self.paper_ids:
                self.paper_ids.add(paper_id)
                formatted_text = f"<paper>ID: {paper_id}\nTitle: {paper['title']}\nAbstract: {paper['abstract']}\n</paper>"
                new_texts.append(formatted_text)
            else:
                logger.info(f"Paper with ID {paper_id} already exists. Skipping.")
                
        if new_texts:
            logger.info(f"Adding {len(new_texts)} new papers to the RAG.")
            
            # Send progress updates if task_queue is provided
            if task_queue:
                await task_queue.put({
                    "status": "running",
                    "progress": 10,
                    "message": f"Processing {len(new_texts)} papers..."
                })
            
            # Process papers in batches and update progress
            batch_size = 5
            total_batches = (len(new_texts) + batch_size - 1) // batch_size
            
            for i in range(0, len(new_texts), batch_size):
                batch = new_texts[i:i+batch_size]
                batch_num = i // batch_size + 1
                
                # Send progress update before processing batch
                if task_queue:
                    progress = int(10 + (batch_num / total_batches) * 80)  # 10-90% progress
                    await task_queue.put({
                        "status": "running",
                        "progress": progress,
                        "message": f"Adding batch {batch_num}/{total_batches} to RAG..."
                    })
                
                # Process the batch
                await self.insert_texts(batch)
            
            # Save paper IDs to file
            paper_ids_file = os.path.join(self.working_dir, 'paper_ids.json')
            with open(paper_ids_file, 'w') as f:
                json.dump(list(self.paper_ids), f)
                
            # Final progress update
            if task_queue:
                await task_queue.put({
                    "status": "completed",
                    "progress": 100,
                    "message": f"Successfully added {len(new_texts)} papers to RAG"
                })
        elif task_queue:
            # No new papers to add
            await task_queue.put({
                "status": "completed",
                "progress": 100,
                "message": "No new papers to add"
            })

# Example usage
async def main():
    handler = GraphRAGHandler()
    try:
        texts = [f"<paper>\nTitle: {p['title']}\nAbstract: {p['abstract']}\n</paper>" for p in DUMMY_DATA["papers"]]
        await handler.insert_texts(texts)

        # Perform hybrid search
        result = await handler.query("What are the major themes from the papers?")
        print(result)
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(main())