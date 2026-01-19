import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import {
  streamText,
  convertToModelMessages,
  consumeStream,
  UIMessage,
} from 'ai';

export const maxDuration = 30;

// Create Qwen client using OpenAI-compatible provider
const qwen = createOpenAICompatible({
  name: 'qwen',
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Debug: log messages received
  console.log("\n📨 [API] ========== NEW REQUEST ==========");
  console.log("📨 [API] messages.length:", messages.length);
  console.log("📨 [API] messages summary:", messages.map(m => ({ 
    role: m.role, 
    text: m.parts?.find(p => p.type === 'text')?.text?.substring(0, 50) + '...'
  })));

  // Get userId from cookie or fallback to default
  const cookies = req.headers.get('cookie') || '';
  const userIdMatch = cookies.match(/membox_user_id=([^;]+)/);
  const effectiveUserId = userIdMatch?.[1] ?? 'default_user';
  
  console.log("👤 [API] effectiveUserId:", effectiveUserId);

  // Get last user message
  const lastMessage = messages.at(-1);
  const lastMessageText =
    lastMessage?.parts?.find((p) => p.type === 'text')?.text ?? '';

  // 1. Search related memories (call backend API)
  let memoryContext = '';
  try {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';
    const searchRes = await fetch(`${backendUrl}/api/memory/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: lastMessageText,
        user_id: effectiveUserId,
        limit: 5,
      }),
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();

      // User profile
      if (searchData.profile_content) {
        memoryContext += `\n👤 User Profile: ${searchData.profile_content}`;
      }

      // Related memories
      if (searchData.results?.length > 0) {
        memoryContext += '\n\n🧠 Related Memories:';
        for (const mem of searchData.results) {
          memoryContext += `\n- ${mem.memory}`;
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch memories:', error);
  }

  // 2. Build system prompt
  const systemPrompt = `You are MemBox, an intelligent memory assistant. You can:
- Remember information shared by users (automatic extraction and saving)
- Provide personalized answers based on memories
- Confirm recording when users say "remember" or share important information

${memoryContext ? `Here is background information related to the current conversation:${memoryContext}` : ''}

Please provide personalized, memory-aware answers based on the above information. Be natural and friendly.`;

  // 3. Stream response
  const result = streamText({
    model: qwen.chatModel('qwen-plus'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  });

  // 4. Save PREVIOUS complete conversation to memory in background
  // PowerMem needs both user message AND assistant response to extract memories
  // So we save the previous round (user + assistant) when a new message comes in
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';
  
  // Find the last complete conversation pair (user message + assistant response)
  // messages array: [..., user, assistant, user(current)]
  // We want to save: [user, assistant] from the previous round
  if (messages.length >= 3) {
    // Get the previous user message and its assistant response
    const prevUserIdx = messages.length - 3;
    const prevAssistantIdx = messages.length - 2;
    const prevUser = messages[prevUserIdx];
    const prevAssistant = messages[prevAssistantIdx];
    
    if (prevUser?.role === 'user' && prevAssistant?.role === 'assistant') {
      const conversationToSave = [
        {
          role: 'user',
          content: prevUser.parts?.find((p) => p.type === 'text')?.text ?? '',
        },
        {
          role: 'assistant', 
          content: prevAssistant.parts?.find((p) => p.type === 'text')?.text ?? '',
        },
      ];
      
      console.log("💾 [API] Saving previous conversation:", conversationToSave);
      
      fetch(`${backendUrl}/api/memory/add-conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationToSave,
          user_id: effectiveUserId,
          // memory_type is omitted to enable auto-classification by LLM
        }),
      }).catch(console.error);
    }
  } else {
    console.log(`💾 [API] Skipping save - messages.length=${messages.length}, need >= 3`);
  }

  return result.toUIMessageStreamResponse({
    consumeSseStream: consumeStream,
  });
}
