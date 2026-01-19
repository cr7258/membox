"""
Chat API Routes
"""
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from openai import OpenAI

from ..memory_manager import get_memory_manager

router = APIRouter()

# Initialize Qwen client
client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
)


class ChatMessage(BaseModel):
    """Chat message"""
    role: str  # user/assistant
    content: str


class ChatRequest(BaseModel):
    """Chat request"""
    messages: List[ChatMessage]
    user_id: str
    stream: bool = True


@router.post("/completions")
async def chat_completions(request: ChatRequest):
    """
    Chat completions API
    
    Flow:
    1. Search related memories
    2. Get user profile
    3. Build context-aware prompt
    4. Call LLM to generate response
    5. Save conversation to memory in background
    """
    try:
        mm = get_memory_manager()
        
        # Get last user message
        last_message = request.messages[-1].content if request.messages else ""
        
        # 1. Search related memories
        memory_results = mm.search_memory(
            query=last_message,
            user_id=request.user_id,
            limit=5,
            add_profile=True
        )
        
        # 2. Build context
        context_parts = []
        
        # User profile
        if memory_results.get('profile_content'):
            context_parts.append(f"👤 User Profile: {memory_results['profile_content']}")
        
        # Related memories
        if memory_results.get('results'):
            memories = memory_results['results']
            if memories:
                context_parts.append("🧠 Related Memories:")
                for mem in memories:
                    context_parts.append(f"  - {mem.get('memory', '')}")
        
        context = "\n".join(context_parts) if context_parts else "No related memories yet"
        
        # 3. Build system prompt
        system_prompt = f"""You are MemBox, an intelligent memory assistant. You can:
- Remember information shared by users (automatic extraction and saving)
- Provide personalized answers based on memories
- Confirm recording when users say "remember" or share important information

Here is the background information related to the current conversation:
{context}

Please provide personalized, memory-aware answers based on the above information. Be natural and friendly."""

        # 4. Build message list
        messages = [{"role": "system", "content": system_prompt}]
        for msg in request.messages:
            messages.append({"role": msg.role, "content": msg.content})
        
        if request.stream:
            # Streaming response
            async def generate():
                response = client.chat.completions.create(
                    model=os.getenv("LLM_MODEL", "qwen-plus"),
                    messages=messages,
                    stream=True
                )
                
                full_response = ""
                for chunk in response:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_response += content
                        yield f"data: {content}\n\n"
                
                yield "data: [DONE]\n\n"
                
                # 5. Save conversation to memory in background
                if len(request.messages) >= 1:
                    conversation = [msg.model_dump() for msg in request.messages[-2:]]
                    conversation.append({"role": "assistant", "content": full_response})
                    try:
                        result = mm.add_conversation(
                            messages=conversation,
                            user_id=request.user_id
                        )
                        print(f"✓ Memory saved")
                    except Exception as e:
                        print(f"Failed to save memory: {e}")
            
            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            )
        else:
            # Non-streaming response
            response = client.chat.completions.create(
                model=os.getenv("LLM_MODEL", "qwen-plus"),
                messages=messages,
                stream=False
            )
            
            assistant_message = response.choices[0].message.content
            
            # Save conversation to memory
            if len(request.messages) >= 1:
                conversation = [msg.model_dump() for msg in request.messages[-2:]]
                conversation.append({"role": "assistant", "content": assistant_message})
                try:
                    mm.add_conversation(
                        messages=conversation,
                        user_id=request.user_id
                    )
                except Exception as e:
                    print(f"Failed to save memory: {e}")
            
            return {
                "message": assistant_message,
                "memory_context": context
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
