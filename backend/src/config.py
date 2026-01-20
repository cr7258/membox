"""
MemBox Configuration
Using Qwen (Tongyi Qianwen) models
"""
import os
from dotenv import load_dotenv

load_dotenv()

# PowerMem configuration
config = {
    # LLM config - intelligent memory extraction, user profiling
    "llm": {
        "provider": "qwen",
        "config": {
            "model": os.getenv("LLM_MODEL", "qwen-plus"),
            "api_key": os.getenv("DASHSCOPE_API_KEY"),
        }
    },
    
    # Embedding config - vectorization
    "embedder": {
        "provider": "qwen",
        "config": {
            "model": os.getenv("EMBEDDING_MODEL", "text-embedding-v4"),
            "embedding_dims": int(os.getenv("EMBEDDING_DIMS", "1536")),
            "api_key": os.getenv("DASHSCOPE_API_KEY"),
        }
    },
    
    # Vector store config - SeekDB (OceanBase)
    "vector_store": {
        "provider": "oceanbase",
        "config": {
            "collection_name": "memories",
            "embedding_model_dims": int(os.getenv("EMBEDDING_DIMS", "1536")),
            "host": os.getenv("OCEANBASE_HOST", "127.0.0.1"),
            "port": int(os.getenv("OCEANBASE_PORT", "2881")),
            "user": os.getenv("OCEANBASE_USER", "root@sys"),
            "password": os.getenv("OCEANBASE_PASSWORD", ""),
            "db_name": os.getenv("OCEANBASE_DATABASE", "membox"),
        }
    },
}
