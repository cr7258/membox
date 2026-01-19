"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type { UIMessage } from "ai";
import { nanoid } from "nanoid";

export interface ChatSession {
  id: string;
  userId: string; // User who owns this session
  title: string;
  preview: string;
  messages: UIMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEY = "membox-chat-sessions";
const CURRENT_SESSION_KEY = "membox-current-session";

// Helper to serialize/deserialize dates
function serializeSessions(sessions: ChatSession[]): string {
  return JSON.stringify(sessions);
}

function deserializeSessions(data: string): ChatSession[] {
  const parsed = JSON.parse(data);
  return parsed.map((session: ChatSession) => ({
    ...session,
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),
  }));
}

// Generate title from first message
function generateTitle(messages: UIMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage) return "New Chat";

  const textPart = firstUserMessage.parts.find((p) => p.type === "text");
  if (!textPart || textPart.type !== "text") return "New Chat";

  const text = textPart.text;
  // Truncate to first 30 characters
  return text.length > 30 ? text.slice(0, 30) + "..." : text;
}

// Generate preview from last message
function generatePreview(messages: UIMessage[]): string {
  if (messages.length === 0) return "No messages";

  const lastMessage = messages[messages.length - 1];
  const textPart = lastMessage.parts.find((p) => p.type === "text");
  if (!textPart || textPart.type !== "text") return "No messages";

  const text = textPart.text;
  return text.length > 50 ? text.slice(0, 50) + "..." : text;
}

export function useChatSessions(userId: string | null) {
  const [allSessions, setAllSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Filter sessions for current user
  const sessions = useMemo(() => {
    if (!userId) return [];
    return allSessions.filter((s) => s.userId === userId);
  }, [allSessions, userId]);

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const loadedSessions = deserializeSessions(stored);
        setAllSessions(loadedSessions);
      }

      const storedCurrentId = localStorage.getItem(CURRENT_SESSION_KEY);
      if (storedCurrentId) {
        setCurrentSessionId(storedCurrentId);
      }
    } catch (error) {
      console.error("Failed to load chat sessions:", error);
    }
    setIsLoaded(true);
  }, []);

  // When user changes, verify current session belongs to user
  useEffect(() => {
    if (!isLoaded || !userId) return;

    // Check if current session belongs to current user
    if (currentSessionId) {
      const currentSession = allSessions.find((s) => s.id === currentSessionId);
      if (!currentSession || currentSession.userId !== userId) {
        // Current session doesn't belong to this user, select first matching or null
        const userSessions = allSessions.filter((s) => s.userId === userId);
        setCurrentSessionId(userSessions[0]?.id || null);
      }
    }
  }, [userId, isLoaded, allSessions, currentSessionId]);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, serializeSessions(allSessions));
    } catch (error) {
      console.error("Failed to save chat sessions:", error);
    }
  }, [allSessions, isLoaded]);

  // Save current session ID
  useEffect(() => {
    if (!isLoaded) return;
    if (currentSessionId) {
      localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId);
    } else {
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
  }, [currentSessionId, isLoaded]);

  // Get current session
  const currentSession = sessions.find((s) => s.id === currentSessionId) || null;

  // Create a new chat session
  const createSession = useCallback((): ChatSession | null => {
    if (!userId) return null;

    const newSession: ChatSession = {
      id: nanoid(),
      userId,
      title: "New Chat",
      preview: "No messages",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setAllSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession;
  }, [userId]);

  // Update session messages
  const updateSessionMessages = useCallback(
    (sessionId: string, messages: UIMessage[]) => {
      setAllSessions((prev) =>
        prev.map((session) => {
          if (session.id !== sessionId) return session;
          return {
            ...session,
            messages,
            title: messages.length > 0 ? generateTitle(messages) : session.title,
            preview: generatePreview(messages),
            updatedAt: new Date(),
          };
        })
      );
    },
    []
  );

  // Delete a session
  const deleteSession = useCallback(
    (sessionId: string) => {
      setAllSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        // Select the next available session for this user or null
        const remainingSessions = sessions.filter((s) => s.id !== sessionId);
        setCurrentSessionId(remainingSessions[0]?.id || null);
      }
    },
    [currentSessionId, sessions]
  );

  // Select a session
  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  // Start a new chat (creates session or clears current)
  const newChat = useCallback(() => {
    createSession();
  }, [createSession]);

  return {
    sessions, // Sessions for current user only
    currentSession,
    currentSessionId,
    isLoaded,
    createSession,
    updateSessionMessages,
    deleteSession,
    selectSession,
    newChat,
  };
}
