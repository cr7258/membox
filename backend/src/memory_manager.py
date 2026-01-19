"""
MemBox Memory Manager
Wraps PowerMem core functionality
"""
import math
from datetime import datetime
from typing import Optional, List, Dict, Any
from powermem import UserMemory
from .config import config


class MemoryManager:
    """Memory Manager - wraps PowerMem operations"""
    
    def __init__(self):
        self.memory = UserMemory(config=config)
    
    def add_memory(
        self, 
        content: str, 
        user_id: str, 
        image_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Add memory
        
        Args:
            content: Memory content
            user_id: User ID
            image_url: Image URL (optional)
        
        Returns:
            Add result
        """
        if image_url:
            # Image memory - use OpenAI multimodal format
            messages = [{
                "role": "user",
                "content": [
                    {"type": "text", "text": content},
                    {"type": "image_url", "image_url": {"url": image_url, "detail": "auto"}}
                ]
            }]
        else:
            # Text-only memory
            messages = content
        
        result = self.memory.add(
            messages=messages,
            user_id=user_id,
            infer=True  # Intelligent extraction
        )
        return result
    
    def add_conversation(
        self,
        messages: List[Dict[str, str]],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Extract memory from conversation
        
        Args:
            messages: Conversation message list [{"role": "user/assistant", "content": "..."}]
            user_id: User ID
        
        Returns:
            Extraction result
        """
        print(f"📝 Adding memory from conversation")
        
        result = self.memory.add(
            messages=messages,
            user_id=user_id,
            infer=True
        )
        
        print(f"   Result: {result}")
        return result
    
    def search_memory(
        self, 
        query: str, 
        user_id: str, 
        limit: int = 5,
        add_profile: bool = True
    ) -> Dict[str, Any]:
        """
        Search memory
        
        Args:
            query: Query content
            user_id: User ID
            limit: Result count
            add_profile: Whether to return user profile
        
        Returns:
            Search results
        """
        results = self.memory.search(
            query=query,
            user_id=user_id,
            limit=limit,
            add_profile=add_profile
        )
        return results
    
    def search_with_retention(
        self,
        query: str,
        user_id: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Weighted search considering forgetting curve
        
        Args:
            query: Query content
            user_id: User ID
            limit: Result count
        
        Returns:
            Weighted search results
        """
        results = self.search_memory(
            query=query,
            user_id=user_id,
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
