"""
File Upload API Routes
"""
import os
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional

from ..memory_manager import get_memory_manager

router = APIRouter()

# Upload directory (backend/uploads)
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Supported image formats
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


def get_file_extension(filename: str) -> str:
    """Get file extension"""
    return os.path.splitext(filename)[1].lower()


def generate_filename(original_filename: str) -> str:
    """Generate unique filename"""
    ext = get_file_extension(original_filename)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    return f"{timestamp}_{unique_id}{ext}"


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    description: str = Form(""),
    memory_type: str = Form("episodic")
):
    """
    Upload image and add to memory
    
    Args:
        file: Image file
        user_id: User ID
        description: Image description (optional)
        memory_type: Memory type, defaults to episodic
    
    Returns:
        Upload result and memory ID
    """
    try:
        # Check file type
        ext = get_file_extension(file.filename)
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file format: {ext}. Supported formats: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Generate filename and save
        filename = generate_filename(file.filename)
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Generate image URL
        # Note: Use full domain in production
        base_url = os.getenv("BASE_URL", "http://localhost:8000")
        image_url = f"{base_url}/uploads/{filename}"
        
        # Add to memory
        mm = get_memory_manager()
        result = mm.add_memory(
            content=description or "User uploaded image",
            user_id=user_id,
            memory_type=memory_type,
            image_url=image_url
        )
        
        return {
            "success": True,
            "filename": filename,
            "url": image_url,
            "memory_result": result
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image-url")
async def add_image_from_url(
    image_url: str = Form(...),
    user_id: str = Form(...),
    description: str = Form(""),
    memory_type: str = Form("episodic")
):
    """
    Add image memory from URL (without downloading)
    
    Args:
        image_url: Image URL
        user_id: User ID
        description: Image description (optional)
        memory_type: Memory type
    
    Returns:
        Add result
    """
    try:
        mm = get_memory_manager()
        result = mm.add_memory(
            content=description or "User shared image",
            user_id=user_id,
            memory_type=memory_type,
            image_url=image_url
        )
        
        return {
            "success": True,
            "url": image_url,
            "memory_result": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
