import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import {
  streamText,
  consumeStream,
  UIMessage,
  convertToModelMessages,
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

  // Get userId from cookie or fallback to default
  const cookies = req.headers.get('cookie') || '';
  const userIdMatch = cookies.match(/membox_user_id=([^;]+)/);
  const effectiveUserId = userIdMatch?.[1] ?? 'default_user';

  // Get last user message text
  const lastMessage = messages.at(-1);
  const lastMessageText =
    lastMessage?.parts?.find((p) => p.type === 'text')?.text ?? '';

  // Check if any message has images (file parts)
  const hasImages = messages.some(
    (m) => m.parts?.some((p) => p.type === 'file')
  );

  // 1. Search related memories (call backend API)
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  let memoryContext = '';
  try {
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
        memoryContext += `\nUser Profile: ${searchData.profile_content}`;
      }

      // Related memories
      if (searchData.results?.length > 0) {
        memoryContext += '\n\nRelated Memories:';
        for (const mem of searchData.results) {
          memoryContext += `\n- ${mem.memory}`;
        }
      }
    }
  } catch {
    // Silently ignore memory fetch errors
  }

  // 2. Build system prompt
  const systemPrompt = `You are MemBox, an intelligent memory assistant. You can:
- Remember information shared by users (automatic extraction and saving)
- Provide personalized answers based on memories
- Confirm recording when users say "remember" or share important information

${memoryContext ? `Here is background information related to the current conversation:${memoryContext}` : ''}

Please provide personalized, memory-aware answers based on the above information. Be natural and friendly.`;

  // 3. Select model based on whether there are images
  const modelName = hasImages ? 'qwen-vl-plus' : 'qwen-plus';

  // 4. Convert messages using standard Vercel AI SDK method
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: qwen.chatModel(modelName),
    system: systemPrompt,
    messages: modelMessages,
    abortSignal: req.signal,
    // 5. Save current conversation to memory after response completes
    async onFinish({ text }) {
      const conversationToSave = [
        { role: 'user', content: lastMessageText || 'User shared images' },
        { role: 'assistant', content: text },
      ];

      try {
        await fetch(`${backendUrl}/api/memory/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: conversationToSave,
            user_id: effectiveUserId,
          }),
        });
      } catch {
        // Silently ignore save errors
      }
    },
  });

  return result.toUIMessageStreamResponse({
    consumeSseStream: consumeStream,
  });
}
