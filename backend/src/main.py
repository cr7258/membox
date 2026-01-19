"""
MemBox Backend - FastAPI Application
"""
import logging
import os
from contextlib import asynccontextmanager

import pymysql
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .memory_manager import get_memory_manager
from .routes import memory, upload

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def init_database():
    """Initialize database (create if not exists)"""
    host = os.getenv("OCEANBASE_HOST", "127.0.0.1")
    port = int(os.getenv("OCEANBASE_PORT", "2881"))
    user = os.getenv("OCEANBASE_USER", "root@sys")
    password = os.getenv("OCEANBASE_PASSWORD", "")
    db_name = os.getenv("OCEANBASE_DATABASE", "membox")
    
    try:
        # Connect to MySQL without specifying database
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
        )
        cursor = conn.cursor()
        
        # Create database
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
        logger.info(f"Database '{db_name}' is ready")
        
        cursor.close()
        conn.close()
    except Exception as e:
        logger.warning(f"Database init warning: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management"""
    # Initialize database
    init_database()
    
    # Initialize memory manager on startup
    mm = get_memory_manager()
    logger.info("MemBox backend started successfully")
    logger.info(f"SeekDB: {os.getenv('OCEANBASE_HOST', '127.0.0.1')}:{os.getenv('OCEANBASE_PORT', '2881')}")
    logger.info(f"LLM: {os.getenv('LLM_MODEL', 'qwen-plus')}")
    yield
    logger.info("MemBox backend shutdown")


app = FastAPI(
    title="MemBox API",
    description="Multimodal Intelligent Memory System - Powered by SeekDB + PowerMem",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Should restrict origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload directory (use parent directory for uploads)
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Static file service (uploaded images)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Register routes
app.include_router(memory.router, prefix="/api/memory", tags=["Memory"])
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "MemBox API",
        "version": "1.0.0",
        "description": "Multimodal Intelligent Memory System"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "membox"}


def main():
    """Entry point for `uv run membox`"""
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
    )

