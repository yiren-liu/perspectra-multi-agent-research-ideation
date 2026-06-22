from llama_index.memory.mem0 import Mem0Memory
from settings import app_settings

config = {
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "collection_name": "test_1",
            "host": "localhost",
            "port": 6333,
            "embedding_model_dims": 1536,  # Change this according to your local model's dimensions
            "on_disk": True,
        },
    },
    "llm": {
        "provider": app_settings.openai_api_type,
        "config": {
            "model": app_settings.openai_model,
            "temperature": 0.2,
            "max_tokens": 1500,
            "api_key": app_settings.openai_api_key,
            "openai_base_url": app_settings.openai_api_base,
            "api_version": app_settings.openai_api_version
        },
    },
    "embedder": {
        "provider": app_settings.openai_api_type,
        "config": {
            "model": "text-embedding-3-small",
            "api_key": app_settings.openai_api_key,
            "openai_base_url": app_settings.openai_api_base,
            "api_version": app_settings.openai_api_version
        },
    },
    "version": "v1.1",
}

def get_mem0_memory(agent_id: str):
    memory_from_config = Mem0Memory.from_config(
        context={"agent_id": agent_id},
        config=config,
        search_msg_limit=5,  # Default is 5
    )
    return memory_from_config