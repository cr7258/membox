"""
MemBox Memory Manager
Wraps PowerMem core functionality
"""
import logging
from typing import Optional, List, Dict, Any
from powermem import UserMemory
from .config import config

logger = logging.getLogger(__name__)


class MemoryManager:
    """Memory Manager - wraps PowerMem operations"""
    
    def __init__(self):
        self.memory = UserMemory(config=config)
    
    def add_memory(
        self,
        messages: List[Dict[str, Any]],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Add memory from conversation
        
        Args:
            messages: Conversation message list 
                      [{"role": "user", "content": "..."}]
            user_id: User ID
        
        Returns:
            Result
        """
        logger.info(f"Adding memory for user: {user_id}")
        result = self.memory.add(
            messages=messages,
            user_id=user_id,
            infer=True
        )
        logger.debug(f"Memory add result: {result}")
        return result
    
    def search_memory(
        self, 
        query: str, 
        user_id: str, 
        limit: int = 5
    ) -> Dict[str, Any]:
        """
        Search memory
        
        Args:
            query: Query content
            user_id: User ID
            limit: Result count
        
        Returns:
            Search results (with user profile)
        """
        logger.info(f"Searching memory for user: {user_id}, query: {query}")
        results = self.memory.search(
            query=query,
            user_id=user_id,
            limit=limit,
            add_profile=True
        )
        logger.debug(f"Search found {len(results.get('results', []))} results")
        return results


# Global singleton
_memory_manager: Optional[MemoryManager] = None

def get_memory_manager() -> MemoryManager:
    """Get memory manager singleton"""
    global _memory_manager
    if _memory_manager is None:
        _memory_manager = MemoryManager()
    return _memory_manager
