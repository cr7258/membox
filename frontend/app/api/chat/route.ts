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
        user_id: 'default_user',
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

  // 4. Save conversation to memory in background (let backend auto-classify)
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';
  fetch(`${backendUrl}/api/memory/add-conversation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.slice(-2).map((m) => ({
        role: m.role,
        content: m.parts?.find((p) => p.type === 'text')?.text ?? '',
      })),
      user_id: 'default_user',
      // memory_type is omitted to enable auto-classification by LLM
    }),
  }).catch(console.error);

  return result.toUIMessageStreamResponse({
    consumeSseStream: consumeStream,
  });
}
