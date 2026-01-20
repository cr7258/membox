"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  BrainIcon,
  ImageIcon,
  RefreshCwIcon,
  MenuIcon,
  XIcon,
  Loader2Icon,
} from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
} from "@/components/elements/prompt-input";
import { Suggestions, Suggestion } from "@/components/elements/suggestion";
import { Loader } from "@/components/elements/loader";
import { Sidebar } from "@/components/elements/sidebar";
import { LoginModal } from "@/components/elements/user-selector";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChatSessions } from "@/hooks/use-chat-sessions";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "My name is John, I work in NYC",
  "Remember I like coffee",
  "My birthday is January 15th",
  "I'm learning TypeScript",
];

export default function Home() {
  const [input, setInput] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [messageImages, setMessageImages] = useState<Record<string, string[]>>({});
  const [imagesToAssociate, setImagesToAssociate] = useState<string[]>([]);
  const [lastProcessedUserMessageId, setLastProcessedUserMessageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User management
  const {
    currentUser,
    users,
    isLoaded: isUserLoaded,
    login,
    switchUser,
    logout,
  } = useUser();

  // Chat sessions (filtered by current user)
  const {
    sessions,
    currentSession,
    currentSessionId,
    isLoaded: isSessionsLoaded,
    createSession,
    updateSessionMessages,
    deleteSession,
    selectSession,
    newChat,
  } = useChatSessions(currentUser?.id ?? null);

  // Chat hook - userId will be passed via sendMessage data
  const userId = currentUser?.id ?? "default_user";
  const { messages, sendMessage, status, setMessages, stop, error } = useChat({
    id: currentSessionId || undefined,
  });

  // Sync messages to session when they change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      updateSessionMessages(currentSessionId, messages);
    }
  }, [messages, currentSessionId, updateSessionMessages]);

  // When switching sessions, load the messages
  useEffect(() => {
    if (currentSession) {
      setMessages(currentSession.messages);
    } else {
      setMessages([]);
    }
  }, [currentSessionId, setMessages]);

  // Create initial session if user is logged in and no sessions exist
  useEffect(() => {
    if (isSessionsLoaded && currentUser && sessions.length === 0) {
      createSession();
    }
  }, [isSessionsLoaded, currentUser, sessions.length, createSession]);

  // Associate images with the latest user message after it's sent
  // Using state instead of ref to avoid stale closure issues
  useEffect(() => {
    // Only run if we have pending images to associate
    if (imagesToAssociate.length === 0) return;
    
    // Find the most recent user message
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return;
    
    const lastUserMessage = userMessages[userMessages.length - 1];
    
    // Check if we already processed this message
    if (lastUserMessage.id === lastProcessedUserMessageId) return;
    
    // Associate images with this message
    setMessageImages(prev => ({
      ...prev,
      [lastUserMessage.id]: [...imagesToAssociate]
    }));
    
    setLastProcessedUserMessageId(lastUserMessage.id);
    setImagesToAssociate([]);
  }, [messages, imagesToAssociate, lastProcessedUserMessageId]);

  // Handle image upload
  const handleImageUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setIsUploading(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

      try {
        const formData = new FormData();
        Array.from(files).forEach((file) => {
          formData.append("files", file);
        });
        formData.append("user_id", userId);

        const response = await fetch(`${backendUrl}/api/upload/images`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setPendingImages((prev) => [...prev, ...data.urls]);
        }
      } catch {
        // Silently ignore upload errors
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [userId]
  );

  // Remove pending image
  const removePendingImage = useCallback((index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(
    async (message: { text: string }) => {
      if (!message.text.trim() && pendingImages.length === 0) return;

      // Create a session if none exists
      if (!currentSessionId) {
        createSession();
      }

      // Store userId in cookie for API route to read
      document.cookie = `membox_user_id=${userId}; path=/; max-age=86400`;
      
      // Store image URLs in cookie for API route to read
      // Use state to track images for association (avoids stale closure)
      if (pendingImages.length > 0) {
        document.cookie = `membox_images=${encodeURIComponent(JSON.stringify(pendingImages))}; path=/; max-age=60`;
        setImagesToAssociate([...pendingImages]);
      } else {
        document.cookie = `membox_images=; path=/; max-age=0`;
      }

      // Clear UI state before sending
      setInput("");
      setPendingImages([]);

      await sendMessage({
        text: message.text || "Please describe these images",
      });
    },
    [sendMessage, currentSessionId, createSession, userId, pendingImages]
  );

  const handleSuggestionClick = useCallback(
    async (suggestion: string) => {
      if (!currentSessionId) {
        createSession();
      }
      // Store userId in cookie for API route to read
      document.cookie = `membox_user_id=${userId}; path=/; max-age=86400`;
      await sendMessage({ text: suggestion });
    },
    [sendMessage, currentSessionId, createSession, userId]
  );

  const handleNewChat = useCallback(() => {
    newChat();
    setMessages([]);
    setMobileSidebarOpen(false);
  }, [newChat, setMessages]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      selectSession(sessionId);
      setMobileSidebarOpen(false);
    },
    [selectSession]
  );

  const isGenerating = status === "submitted" || status === "streaming";

  // Convert sessions for sidebar
  const sidebarSessions = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    preview: s.preview,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));

  // Loading state
  if (!isUserLoaded || !isSessionsLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader size={32} className="text-primary" />
      </div>
    );
  }

  // Login modal - show if no user is logged in
  if (!currentUser) {
    return <LoginModal onLogin={login} />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          sessions={sidebarSessions}
          currentSessionId={currentSessionId}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onDeleteSession={deleteSession}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          currentUser={currentUser}
          users={users}
          onSwitchUser={switchUser}
          onLogout={logout}
          onLogin={login}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar
              sessions={sidebarSessions}
              currentSessionId={currentSessionId}
              onNewChat={handleNewChat}
              onSelectSession={handleSelectSession}
              onDeleteSession={deleteSession}
              isCollapsed={false}
              onToggleCollapse={() => setMobileSidebarOpen(false)}
              currentUser={currentUser}
              users={users}
              onSwitchUser={switchUser}
              onLogout={logout}
              onLogin={login}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Left side */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden"
              >
                <MenuIcon className="w-5 h-5" />
              </Button>
              <span className="font-semibold text-foreground hidden md:block">
                {currentSession?.title || "New Chat"}
              </span>
              <span className="font-semibold text-foreground md:hidden">MemBox</span>
            </div>

            {/* Right side - User indicator on mobile */}
            <div className="md:hidden text-sm text-muted-foreground">
              {currentUser.name}
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-hidden">
          <div
            className={cn(
              "h-full mx-auto px-4 transition-all duration-300",
              sidebarCollapsed ? "max-w-5xl" : "max-w-4xl"
            )}
          >
            <Conversation className="h-full">
              <ConversationContent className="pb-40 pt-6">
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    icon={
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-xl glow float">
                        <BrainIcon className="w-10 h-10 text-white" />
                      </div>
                    }
                    title={`Welcome, ${currentUser.name}!`}
                    description="I'm your intelligent memory assistant. I can remember information you share and recall it whenever you need. Try telling me something about yourself!"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-xl glow float mb-6">
                      <BrainIcon className="w-10 h-10 text-white" />
                    </div>
                    <div className="space-y-2 mb-8">
                      <h2 className="text-2xl font-bold text-foreground">
                        Welcome, {currentUser.name}!
                      </h2>
                      <p className="text-muted-foreground max-w-md">
                        I&apos;m your intelligent memory assistant. I can
                        remember information you share and recall it whenever
                        you need.
                      </p>
                    </div>
                    <Suggestions className="flex-wrap justify-center gap-2">
                      {SUGGESTIONS.map((text) => (
                        <Suggestion
                          key={text}
                          suggestion={text}
                          onClick={handleSuggestionClick}
                        />
                      ))}
                    </Suggestions>
                  </ConversationEmptyState>
                ) : (
                  <>
                    {messages.map((message) => {
                      const images = messageImages[message.id];
                      return (
                      <Message key={message.id} from={message.role}>
                        {/* Show images for user messages */}
                        {message.role === "user" && images && images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {images.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`Image ${idx + 1}`}
                                className="max-w-[200px] max-h-[200px] object-cover rounded-lg border border-border"
                              />
                            ))}
                          </div>
                        )}
                        {message.parts
                          ?.filter((part) => part.type === "text")
                          ?.map((part, index) => (
                            <MessageContent
                              key={`${message.id}-${part.type}-${index}`}
                            >
                              {message.role === "assistant" ? (
                                <MessageResponse>{part.text}</MessageResponse>
                              ) : (
                                <span className="whitespace-pre-wrap">
                                  {part.text}
                                </span>
                              )}
                            </MessageContent>
                          ))}
                      </Message>
                    );
                    })}

                    {status === "submitted" && (
                      <Message from="assistant">
                        <MessageContent>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader size={18} />
                            <span className="text-sm">Thinking...</span>
                          </div>
                        </MessageContent>
                      </Message>
                    )}

                    {error && (
                      <div className="flex justify-center">
                        <div className="glass rounded-xl px-4 py-3 flex items-center gap-3 border-destructive/50">
                          <span className="text-destructive text-sm">
                            Something went wrong. Please try again.
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.location.reload()}
                            className="text-destructive hover:text-destructive"
                          >
                            <RefreshCwIcon className="w-4 h-4 mr-1" />
                            Retry
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          </div>
        </main>

        {/* Input Area */}
        <footer className="sticky bottom-0 pb-6 pt-4 bg-gradient-to-t from-background via-background/95 to-transparent">
          <div
            className={cn(
              "mx-auto px-4 transition-all duration-300",
              sidebarCollapsed ? "max-w-5xl" : "max-w-4xl"
            )}
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files)}
            />

            <PromptInput
              onSubmit={handleSubmit}
              value={input}
              onInputChange={setInput}
            >
              <PromptInputBody>
                {/* Image previews */}
                {pendingImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 border-b border-border/50">
                    {pendingImages.map((url, index) => (
                      <div key={url} className="relative group">
                        <img
                          src={url}
                          alt={`Upload ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => removePendingImage(index)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {isUploading && (
                      <div className="w-16 h-16 rounded-lg border border-border flex items-center justify-center bg-muted">
                        <Loader2Icon className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                )}
                <PromptInputTextarea
                  value={input}
                  onValueChange={setInput}
                  placeholder={pendingImages.length > 0 ? "Ask about these images..." : "Tell me something to remember..."}
                  disabled={isGenerating}
                />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PromptInputButton
                        type="button"
                        className={cn(
                          "text-muted-foreground hover:text-foreground",
                          pendingImages.length > 0 && "text-primary"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2Icon className="w-4 h-4 animate-spin" />
                        ) : (
                          <ImageIcon className="w-4 h-4" />
                        )}
                      </PromptInputButton>
                    </TooltipTrigger>
                  </Tooltip>
                  {pendingImages.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {pendingImages.length} images
                    </span>
                  )}
                </PromptInputTools>
                <PromptInputSubmit
                  status={status}
                  onStop={stop}
                  disabled={(!input.trim() && pendingImages.length === 0) && !isGenerating}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </footer>
      </div>
    </div>
  );
}
