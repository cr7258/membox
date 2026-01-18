"""
MemBox Memory Manager
Wraps PowerMem core functionality with LLM-based memory classification

Memory Types (based on LangChain Memory concepts):
- semantic: Facts, knowledge, and concepts
- episodic: Personal experiences and events
- procedural: User preferences and rules
- working: Temporary tasks and reminders

Reference: https://docs.langchain.com/oss/python/concepts/memory
"""
import os
import math
from datetime import datetime
from typing import Optional, List, Dict, Any
from openai import OpenAI
from powermem import UserMemory
from .config import config, MEMORY_TYPES, MEMORY_CLASSIFICATION_PROMPT


class MemoryManager:
    """Memory Manager - wraps PowerMem operations with auto classification"""
    
    def __init__(self):
        self.memory = UserMemory(config=config)
        self._init_llm_client()
        self._init_sub_stores()
    
    def _init_llm_client(self):
        """Initialize LLM client for memory classification"""
        self.llm_client = OpenAI(
            api_key=os.getenv("DASHSCOPE_API_KEY"),
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
        )
        self.llm_model = os.getenv("LLM_MODEL", "qwen-plus")
    
    def _init_sub_stores(self):
        """
        Activate Sub Stores (REQUIRED for routing to work)
        
        According to PowerMem docs: Sub stores must be explicitly activated by calling 
        migrate_to_sub_store() at least once, even if there's no data to migrate.
        Without activation, all data goes to main store only.
        """
        try:
            # Access the internal Memory instance to call migrate_all_sub_stores
            internal_memory = self.memory.memory
            
            # Check if sub_stores_config exists
            if not internal_memory.sub_stores_config:
                print("⚠ No sub stores configured in Memory instance")
                return
            
            print(f"  Activating {len(internal_memory.sub_stores_config)} sub stores...")
            
            # Migrate all sub stores at once (REQUIRED for activation)
            results = internal_memory.migrate_all_sub_stores(delete_source=True)
            
            for store_name, count in results.items():
                print(f"  ✓ {store_name} activated, migrated {count} records")
            
            print("✓ All Sub Stores activated - new memories will route automatically based on memory_type")
        except Exception as e:
            import traceback
            print(f"⚠ Sub Stores activation failed: {e}")
            traceback.print_exc()
    
    def classify_memory_type(self, conversation: str) -> str:
        """
        Use LLM to classify memory type from conversation
        
        Args:
            conversation: Conversation text to classify
        
        Returns:
            Memory type (semantic/episodic/procedural/working/none)
        """
        try:
            prompt = MEMORY_CLASSIFICATION_PROMPT.format(conversation=conversation)
            
            response = self.llm_client.chat.completions.create(
                model=self.llm_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=20,
                temperature=0.1  # Low temperature for consistent classification
            )
            
            result = response.choices[0].message.content.strip().lower()
            print(f"🤖 LLM classification raw result: '{result}'")
            
            # Validate result
            if result in MEMORY_TYPES or result == "none":
                print(f"   → Valid type: {result}")
                return result
            
            # Default to semantic if invalid response
            print(f"   → Invalid response, defaulting to: semantic")
            return "semantic"
            
        except Exception as e:
            print(f"❌ Memory classification failed: {e}")
            return "semantic"  # Default to semantic on error
    
    def add_memory(
        self, 
        content: str, 
        user_id: str, 
        memory_type: Optional[str] = None,  # None = auto classify
        image_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Add memory with optional auto classification
        
        Args:
            content: Memory content
            user_id: User ID
            memory_type: Memory type (working/episodic/semantic/procedural), None for auto
            image_url: Image URL (optional)
        
        Returns:
            Add result with classified memory type
        """
        # Auto classify if memory_type not specified
        if memory_type is None:
            memory_type = self.classify_memory_type(content)
            if memory_type == "none":
                return {"skipped": True, "reason": "No memorable content detected"}
        
        if image_url:
            # Image memory - use OpenAI multimodal format
            messages = [{
                "role": "user",
                "content": [
                    {"type": "text", "text": content},
                    {"type": "image_url", "image_url": {"url": image_url, "detail": "auto"}}
                ]
            }]
            # Images are typically episodic memories
            if memory_type == "semantic":
                memory_type = "episodic"
        else:
            # Text-only memory
            messages = content
        
        result = self.memory.add(
            messages=messages,
            user_id=user_id,
            metadata={"memory_type": memory_type},
            infer=True  # Intelligent extraction
        )
        
        # Add classified type to result
        result["classified_type"] = memory_type
        return result
    
    def add_conversation(
        self,
        messages: List[Dict[str, str]],
        user_id: str,
        memory_type: Optional[str] = None,  # None = auto classify
        auto_classify: bool = True
    ) -> Dict[str, Any]:
        """
        Extract memory from conversation with auto classification
        
        Args:
            messages: Conversation message list [{"role": "user/assistant", "content": "..."}]
            user_id: User ID
            memory_type: Memory type (None for auto classification)
            auto_classify: Whether to auto classify (default True)
        
        Returns:
            Extraction result with classified memory type
        """
        # Build conversation text for classification
        conversation_text = "\n".join([
            f"{msg['role']}: {msg['content']}" 
            for msg in messages
        ])
        
        # Auto classify if enabled and memory_type not specified
        if auto_classify and memory_type is None:
            memory_type = self.classify_memory_type(conversation_text)
            print(f"🔍 Auto classified memory_type: {memory_type}")
            if memory_type == "none":
                print("  → Skipping: No memorable content detected")
                return {"skipped": True, "reason": "No memorable content detected"}
        elif memory_type is None:
            memory_type = "semantic"  # Default if auto_classify is False
        
        print(f"📝 Adding memory with type: {memory_type}")
        print(f"   Metadata: {{'memory_type': '{memory_type}'}}")
        
        result = self.memory.add(
            messages=messages,
            user_id=user_id,
            metadata={"memory_type": memory_type},
            infer=True
        )
        
        print(f"   Result: {result}")
        
        # Add classified type to result
        result["classified_type"] = memory_type
        return result
    
    def search_memory(
        self, 
        query: str, 
        user_id: str, 
        memory_type: Optional[str] = None, 
        limit: int = 5,
        add_profile: bool = True
    ) -> Dict[str, Any]:
        """
        Search memory
        
        Args:
            query: Query content
            user_id: User ID
            memory_type: Memory type filter (optional)
            limit: Result count
            add_profile: Whether to return user profile
        
        Returns:
            Search results
        """
        filters = {"memory_type": memory_type} if memory_type else None
        
        results = self.memory.search(
            query=query,
            user_id=user_id,
            filters=filters,
            limit=limit,
            add_profile=add_profile
        )
        return results
    
    def search_with_retention(
        self,
        query: str,
        user_id: str,
        memory_type: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Weighted search considering forgetting curve
        
        Args:
            query: Query content
            user_id: User ID
            memory_type: Memory type filter
            limit: Result count
        
        Returns:
            Weighted search results
        """
        results = self.search_memory(
            query=query,
            user_id=user_id,
            memory_type=memory_type,
            limit=limit * 2,  # Get more results for weighting
            add_profile=False
        )
        
        now = datetime.now()
        weighted_results = []
        
        for mem in results.get('results', []):
            created_at = mem.get('created_at')
            if created_at:
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                hours_elapsed = (now - created_at.replace(tzinfo=None)).total_seconds() / 3600
                retention = self.calculate_retention(hours_elapsed)
            else:
                retention = 0.9
            
            similarity = mem.get('score', 0)
            combined_score = similarity * retention
            
            weighted_results.append({
                **mem,
                'retention': retention,
                'combined_score': combined_score
            })
        
        weighted_results.sort(key=lambda x: x['combined_score'], reverse=True)
        return weighted_results[:limit]
    
    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """
        Get user profile
        
        Args:
            user_id: User ID
        
        Returns:
            User profile
        """
        return self.memory.profile(user_id=user_id)
    
    def get_all_memories(self, user_id: str) -> Dict[str, Any]:
        """
        Get all memories for user
        
        Args:
            user_id: User ID
        
        Returns:
            All memories
        """
        return self.memory.get_all(user_id=user_id)
    
    def get_memories_by_type(self, user_id: str, memory_type: str) -> Dict[str, Any]:
        """
        Get all memories of a specific type
        
        Args:
            user_id: User ID
            memory_type: Memory type (semantic/episodic/procedural/working)
        
        Returns:
            Memories of the specified type
        """
        return self.search_memory(
            query="",  # Empty query to get all
            user_id=user_id,
            memory_type=memory_type,
            limit=100,
            add_profile=False
        )
    
    def get_memories_need_review(
        self,
        user_id: str,
        retention_threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Get memories that need review
        
        Args:
            user_id: User ID
            retention_threshold: Retention rate threshold
        
        Returns:
            List of memories needing review
        """
        all_memories = self.get_all_memories(user_id=user_id)
        
        now = datetime.now()
        need_review = []
        
        for mem in all_memories.get('results', []):
            created_at = mem.get('created_at')
            if created_at:
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                hours_elapsed = (now - created_at.replace(tzinfo=None)).total_seconds() / 3600
                retention = self.calculate_retention(hours_elapsed)
                
                if retention < retention_threshold:
                    need_review.append({
                        **mem,
                        'retention': retention
                    })
        
        return need_review
    
    def delete_memory(self, memory_id: str, user_id: str) -> bool:
        """
        Delete memory
        
        Args:
            memory_id: Memory ID
            user_id: User ID
        
        Returns:
            Success status
        """
        try:
            self.memory.delete(memory_id=memory_id, user_id=user_id)
            return True
        except Exception as e:
            print(f"Failed to delete memory: {e}")
            return False
    
    @staticmethod
    def calculate_retention(hours_elapsed: float) -> float:
        """
        Calculate memory retention rate (Ebbinghaus forgetting curve)
        
        Retention rate over time:
        - 0h:   100%
        - 20min: 58%
        - 1h:    44%
        - 1d:    33%
        - 6d:    25%
        - 31d:   21%
        
        Args:
            hours_elapsed: Hours elapsed
        
        Returns:
            Retention rate (0.2 ~ 1.0)
        """
        if hours_elapsed <= 0:
            return 1.0
        
        # Decay constant based on Ebbinghaus curve
        base_retention_1h = 0.44  # 44% retention after 1 hour
        decay_constant = -math.log(base_retention_1h)
        retention = math.exp(-decay_constant * hours_elapsed)
        
        return max(retention, 0.2)  # Minimum 20% retention


# Global singleton
_memory_manager: Optional[MemoryManager] = None

def get_memory_manager() -> MemoryManager:
    """Get memory manager singleton"""
    global _memory_manager
    if _memory_manager is None:
        _memory_manager = MemoryManager()
    return _memory_manager
