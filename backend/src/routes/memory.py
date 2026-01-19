"""
Memory Management API Routes
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict

from ..memory_manager import get_memory_manager

logger = logging.getLogger(__name__)

router = APIRouter()


class AddMemoryRequest(BaseModel):
    """Add memory request"""
    messages: List[Dict[str, str]]
    user_id: str


class SearchMemoryRequest(BaseModel):
    """Search memory request"""
    query: str
    user_id: str
    limit: int = 5


@router.post("/add")
async def add_memory(request: AddMemoryRequest):
    """Add memory from conversation"""
    try:
        mm = get_memory_manager()
        result = mm.add_memory(
            messages=request.messages,
            user_id=request.user_id
        )
        return {"success": True, "result": result}
    except Exception as e:
        logger.error(f"Failed to add memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_memory(request: SearchMemoryRequest):
    """Search memory"""
    try:
        mm = get_memory_manager()
        results = mm.search_memory(
            query=request.query,
            user_id=request.user_id,
            limit=request.limit
        )
        return results
    except Exception as e:
        logger.error(f"Failed to search memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))
