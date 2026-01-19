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
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';
  
  const result = streamText({
    model: qwen.chatModel('qwen-plus'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
    // 4. Save current conversation to memory after response completes
    async onFinish({ text }) {
      const conversationToSave = [
        {
          role: 'user',
          content: lastMessageText,
        },
        {
          role: 'assistant',
          content: text,
        },
      ];
      
      console.log("💾 [API] Saving conversation:", conversationToSave);
      
      try {
        await fetch(`${backendUrl}/api/memory/add-conversation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: conversationToSave,
            user_id: effectiveUserId,
          }),
        });
        console.log("✅ [API] Conversation saved to memory");
      } catch (error) {
        console.error("❌ [API] Failed to save conversation:", error);
      }
    },
  });

  return result.toUIMessageStreamResponse({
    consumeSseStream: consumeStream,
  });
}
