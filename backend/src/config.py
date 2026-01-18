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
MEMORY_CLASSIFICATION_PROMPT = """Classify the following conversation into ONE memory type.

MEMORY TYPES:
- semantic: Static facts about the user (name, job, skills, preferences, relationships)
  Examples: "My name is John", "I work at Google", "I like coffee", "I speak Chinese"
  
- episodic: Time-bound experiences, events, trips, meetings, activities
  Examples: "I traveled to Japan last summer", "Yesterday I met Tom", "I graduated in 2020", "Last week I finished a project"
  
- procedural: Instructions or rules for how the AI should behave
  Examples: "Please respond in English", "Keep answers short", "Don't use emojis"
  
- working: Current tasks, reminders, temporary items with deadlines
  Examples: "Meeting at 3pm tomorrow", "Remind me to call mom", "Need to submit report by Friday"

IMPORTANT: If the conversation mentions a specific TIME (yesterday, last summer, in 2020, last week, etc.), it's usually EPISODIC, not semantic.

Conversation:
{conversation}

Respond with ONLY ONE word: semantic, episodic, procedural, working, or none.

Memory type:"""
