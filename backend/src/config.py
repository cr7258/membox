"""
MemBox Configuration
Using Qwen (Tongyi Qianwen) models

Memory Types (based on LangChain Memory concepts):
- semantic: Facts and knowledge (e.g., "My name is John", "Python is a programming language")
- episodic: Experiences and events (e.g., "I visited Paris last summer", "Had coffee with Tom yesterday")
- procedural: Rules and preferences (e.g., "I prefer short responses", "Always reply in English")
- working: Temporary tasks and reminders (e.g., "Meeting at 3pm", "Remind me to buy milk")

Reference: https://docs.langchain.com/oss/python/concepts/memory
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Memory type definitions
MEMORY_TYPES = {
    "semantic": "Facts, knowledge, and concepts about the user or world",
    "episodic": "Personal experiences, events, and memories",
    "procedural": "User preferences, rules, and instructions for the AI",
    "working": "Temporary tasks, reminders, and to-do items",
}

# PowerMem configuration
config = {
    # LLM config - intelligent memory extraction, user profiling
    "llm": {
        "provider": "qwen",
        "config": {
            "model": os.getenv("LLM_MODEL", "qwen-plus"),
            "api_key": os.getenv("DASHSCOPE_API_KEY"),
            "enable_vision": True,  # Enable Vision capability
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
    
    # Sub Stores config - memory partitioning by type
    "sub_stores": [
        {
            # Working memory - short-term tasks, reminders
            "collection_name": "working_memories",
            "routing_filter": {"memory_type": "working"},
            "embedding_model_dims": 1536,
        },
        {
            # Episodic memory - personal experiences, events
            "collection_name": "episodic_memories",
            "routing_filter": {"memory_type": "episodic"},
            "embedding_model_dims": 1536,
        },
        {
            # Procedural memory - user preferences, rules
            "collection_name": "procedural_memories",
            "routing_filter": {"memory_type": "procedural"},
            "embedding_model_dims": 1536,
        }
    ],
    
    "version": "v1.2",
}

# Prompt for LLM to classify memory type
MEMORY_CLASSIFICATION_PROMPT = """You are a memory classification assistant. Analyze the following conversation and determine what type of memory it represents.

Memory Types:
- semantic: Facts, knowledge, and concepts (e.g., "My name is John", "I work at Google", "Python is a programming language")
- episodic: Personal experiences and events (e.g., "I visited Paris last summer", "Yesterday I had coffee with Tom")
- procedural: User preferences and rules for the AI (e.g., "I prefer short responses", "Always reply in English", "Don't use emojis")
- working: Temporary tasks and reminders (e.g., "Meeting at 3pm tomorrow", "Remind me to buy milk", "I need to call mom")

Conversation:
{conversation}

Respond with ONLY the memory type (one of: semantic, episodic, procedural, working). If the conversation doesn't contain memorable information, respond with "none".

Memory type:"""
