"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useCallback, useEffect } from "react";
import {
  BrainIcon,
  ImageIcon,
  SparklesIcon,
  RefreshCwIcon,
  MenuIcon,
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
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChatSessions } from "@/hooks/use-chat-sessions";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "My name is John, I work in NYC",
  "Remember I like coffee ☕",
  "My birthday is January 15th",
  "I'm learning TypeScript",
];

export default function Home() {
  const [input, setInput] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const {
    sessions,
    currentSession,
    currentSessionId,
    isLoaded,
    createSession,
    updateSessionMessages,
    deleteSession,
    selectSession,
    newChat,
  } = useChatSessions();

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

  // Create initial session if none exists
  useEffect(() => {
    if (isLoaded && sessions.length === 0) {
      createSession();
    }
  }, [isLoaded, sessions.length, createSession]);

  const handleSubmit = useCallback(
    async (message: { text: string }) => {
      if (!message.text.trim()) return;

      // Create a session if none exists
      if (!currentSessionId) {
        createSession();
      }

      await sendMessage({ text: message.text });
      setInput("");
    },
    [sendMessage, currentSessionId, createSession]
  );

  const handleSuggestionClick = useCallback(
    async (suggestion: string) => {
      if (!currentSessionId) {
        createSession();
      }
      await sendMessage({ text: suggestion });
    },
    [sendMessage, currentSessionId, createSession]
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

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader size={32} className="text-primary" />
      </div>
    );
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
                    title="Welcome to MemBox"
                    description="I'm your intelligent memory assistant. I can remember information you share and recall it whenever you need. Try telling me something about yourself!"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-xl glow float mb-6">
                      <BrainIcon className="w-10 h-10 text-white" />
                    </div>
                    <div className="space-y-2 mb-8">
                      <h2 className="text-2xl font-bold text-foreground">
                        Welcome to MemBox
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
                    {messages.map((message) => (
                      <Message key={message.id} from={message.role}>
                        {message.parts
                          .filter((part) => part.type === "text")
                          .map((part, index) => (
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
                    ))}

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
            <PromptInput
              onSubmit={handleSubmit}
              value={input}
              onInputChange={setInput}
            >
              <PromptInputBody>
                <PromptInputTextarea
                  value={input}
                  onValueChange={setInput}
                  placeholder="Tell me something to remember..."
                  disabled={isGenerating}
                />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PromptInputButton
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </PromptInputButton>
                    </TooltipTrigger>
                    <TooltipContent>Upload image</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PromptInputButton
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <SparklesIcon className="w-4 h-4" />
                      </PromptInputButton>
                    </TooltipTrigger>
                    <TooltipContent>Memory features</TooltipContent>
                  </Tooltip>
                  <span className="text-xs text-muted-foreground ml-2">
                    {input.length} / 2000
                  </span>
                </PromptInputTools>
                <PromptInputSubmit
                  status={status}
                  onStop={stop}
                  disabled={!input.trim() && !isGenerating}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </footer>
      </div>
    </div>
  );
}
