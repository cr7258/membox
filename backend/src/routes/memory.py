"""
Memory Management API Routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from ..memory_manager import get_memory_manager

router = APIRouter()


class AddMemoryRequest(BaseModel):
    """Add memory request"""
    content: str
    user_id: str
    memory_type: Optional[str] = None  # None = auto classify (semantic/episodic/procedural/working)
    image_url: Optional[str] = None


class AddConversationRequest(BaseModel):
    """Add conversation request"""
    messages: List[Dict[str, str]]
    user_id: str
    memory_type: Optional[str] = None  # None = auto classify
    auto_classify: bool = True  # Enable auto classification


class SearchMemoryRequest(BaseModel):
    """Search memory request"""
    query: str
    user_id: str
    memory_type: Optional[str] = None
    limit: int = 5
    use_retention: bool = False  # Whether to consider forgetting curve


class DeleteMemoryRequest(BaseModel):
    """Delete memory request"""
    memory_id: str
    user_id: str


@router.post("/add")
async def add_memory(request: AddMemoryRequest):
    """Add memory"""
    try:
        mm = get_memory_manager()
        result = mm.add_memory(
            content=request.content,
            user_id=request.user_id,
            memory_type=request.memory_type,
            image_url=request.image_url
        )
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/add-conversation")
async def add_conversation(request: AddConversationRequest):
    """Extract memory from conversation with auto classification"""
    try:
        mm = get_memory_manager()
        result = mm.add_conversation(
            messages=request.messages,
            user_id=request.user_id,
            memory_type=request.memory_type,
            auto_classify=request.auto_classify
        )
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_memory(request: SearchMemoryRequest):
    """Search memory"""
    try:
        mm = get_memory_manager()
        
        if request.use_retention:
            # Weighted search considering forgetting curve
            results = mm.search_with_retention(
                query=request.query,
                user_id=request.user_id,
                memory_type=request.memory_type,
                limit=request.limit
            )
            return {"results": results}
        else:
            # Normal search
            results = mm.search_memory(
                query=request.query,
                user_id=request.user_id,
                memory_type=request.memory_type,
                limit=request.limit
            )
            return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    """Get user profile"""
    try:
        mm = get_memory_manager()
        profile = mm.get_user_profile(user_id)
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all/{user_id}")
async def get_all_memories(user_id: str):
    """Get all memories for user"""
    try:
        mm = get_memory_manager()
        memories = mm.get_all_memories(user_id)
        return memories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/need-review/{user_id}")
async def get_memories_need_review(user_id: str, threshold: float = 0.3):
    """Get memories that need review"""
    try:
        mm = get_memory_manager()
        memories = mm.get_memories_need_review(user_id, retention_threshold=threshold)
        return {"results": memories, "count": len(memories)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete")
async def delete_memory(request: DeleteMemoryRequest):
    """Delete memory"""
    try:
        mm = get_memory_manager()
        success = mm.delete_memory(request.memory_id, request.user_id)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
