"""
File Upload API Routes
"""
import os
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List

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


@router.post("/images")
async def upload_images(
    files: List[UploadFile] = File(...),
    user_id: str = Form(...)
):
    """
    Upload one or more images
    
    Args:
        files: List of image files (can be single or multiple)
        user_id: User ID
    
    Returns:
        List of uploaded image URLs
    """
    try:
        uploaded_urls = []
        uploaded_filenames = []
        
        for file in files:
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
            base_url = os.getenv("BASE_URL", "http://localhost:8000")
            image_url = f"{base_url}/uploads/{filename}"
            
            uploaded_urls.append(image_url)
            uploaded_filenames.append(filename)
        
        return {
            "success": True,
            "count": len(uploaded_urls),
            "filenames": uploaded_filenames,
            "urls": uploaded_urls
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
