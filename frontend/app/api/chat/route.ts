import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import {
  streamText,
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
  
  // Type for attachments
  type Attachment = { url: string; contentType?: string; name?: string };
  
  // Get attachments from message (handle both formats)
  const getAttachments = (m: UIMessage): Attachment[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = m as any;
    return msg.experimental_attachments ?? [];
  };
  
  console.log("📨 [API] messages summary:", messages.map(m => ({ 
    role: m.role, 
    text: m.parts?.find(p => p.type === 'text')?.text?.substring(0, 50) + '...',
    attachments: getAttachments(m).length
  })));

  // Get userId from cookie or fallback to default
  const cookies = req.headers.get('cookie') || '';
  const userIdMatch = cookies.match(/membox_user_id=([^;]+)/);
  const effectiveUserId = userIdMatch?.[1] ?? 'default_user';
  
  // Get image URLs from cookie
  const imagesMatch = cookies.match(/membox_images=([^;]+)/);
  let imageUrlsFromCookie: string[] = [];
  if (imagesMatch?.[1]) {
    try {
      imageUrlsFromCookie = JSON.parse(decodeURIComponent(imagesMatch[1]));
    } catch {
      imageUrlsFromCookie = [];
    }
  }
  
  console.log("👤 [API] effectiveUserId:", effectiveUserId);

  // Get last user message
  const lastMessage = messages.at(-1);
  const lastMessageText =
    lastMessage?.parts?.find((p) => p.type === 'text')?.text ?? '';
  
  // Get image URLs - prioritize cookie, fallback to attachments
  const lastMessageAttachments = lastMessage ? getAttachments(lastMessage) : [];
  const attachmentImages = lastMessageAttachments
    .filter((a: Attachment) => a.contentType?.startsWith('image/'))
    .map((a: Attachment) => a.url);
  
  // Use cookie images for current message, or attachment images
  const lastMessageImages = imageUrlsFromCookie.length > 0 ? imageUrlsFromCookie : attachmentImages;
  
  // Check if current message has images
  const hasImages = lastMessageImages.length > 0;
  
  console.log("🖼️ [API] hasImages:", hasImages, "lastMessageImages:", lastMessageImages);

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

  // 3. Stream response - use qwen-vl-plus for images, qwen-plus for text only
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';
  const modelName = hasImages ? 'qwen-vl-plus' : 'qwen-plus';
  console.log("🤖 [API] Using model:", modelName);
  
  // Build messages with image support
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelMessages: any[] = [];
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isLastMessage = i === messages.length - 1;
    const textContent = msg.parts?.find(p => p.type === 'text')?.text ?? '';
    
    // For last user message, use images from cookie
    const imageUrls = (isLastMessage && msg.role === 'user') ? lastMessageImages : [];
    
    if (msg.role === 'user') {
      if (imageUrls.length > 0) {
        // Multimodal message with images
        const content: Array<{ type: string; text?: string; image?: URL }> = [
          { type: 'text', text: textContent || 'Please describe these images' }
        ];
        for (const url of imageUrls) {
          content.push({ type: 'image', image: new URL(url) });
        }
        modelMessages.push({ role: 'user', content });
      } else {
        modelMessages.push({ role: 'user', content: textContent });
      }
    } else if (msg.role === 'assistant') {
      modelMessages.push({ role: 'assistant', content: textContent });
    }
  }
  
  console.log("📤 [API] Model messages built:", modelMessages.length);
  
  const result = streamText({
    model: qwen.chatModel(modelName),
    system: systemPrompt,
    messages: modelMessages,
    abortSignal: req.signal,
    // 4. Save current conversation to memory after response completes
    async onFinish({ text }) {
      const conversationToSave = [
        { role: 'user', content: lastMessageText || 'User shared images' },
        { role: 'assistant', content: text },
      ];
      
      console.log("💾 [API] Saving conversation");
      
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
