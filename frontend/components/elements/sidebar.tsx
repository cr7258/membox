"use client";
import {
  PlusIcon,
  MessageSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  BrainIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {

  // Group sessions by date
  const groupedSessions = sessions.reduce(
    (groups, session) => {
      const date = new Date(session.updatedAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday";
      } else if (date > lastWeek) {
        groupKey = "Last 7 Days";
      } else {
        groupKey = "Older";
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(session);
      return groups;
    },
    {} as Record<string, ChatSession[]>
  );

  const groupOrder = ["Today", "Yesterday", "Last 7 Days", "Older"];

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center py-4 w-16 border-r border-border/50 bg-background/50 backdrop-blur-sm">
        {/* Logo */}
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-lg mb-4">
          <BrainIcon className="w-5 h-5" />
        </div>

        {/* New Chat Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNewChat}
              className="mb-4 text-muted-foreground hover:text-foreground hover:bg-primary/10"
            >
              <PlusIcon className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">New Chat</TooltipContent>
        </Tooltip>

        {/* Expand Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="mt-auto text-muted-foreground hover:text-foreground"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand sidebar</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-72 border-r border-border/50 bg-background/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-md">
            <BrainIcon className="w-4 h-4" />
          </div>
          <span className="font-semibold text-foreground">MemBox</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleCollapse}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Collapse sidebar</TooltipContent>
        </Tooltip>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
          variant="ghost"
        >
          <PlusIcon className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1 px-3">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquareIcon className="w-10 h-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Start a new chat to begin
            </p>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {groupOrder.map((groupKey) => {
              const groupSessions = groupedSessions[groupKey];
              if (!groupSessions || groupSessions.length === 0) return null;

              return (
                <div key={groupKey}>
                  <p className="text-xs font-medium text-muted-foreground px-2 mb-2">
                    {groupKey}
                  </p>
                  <div className="space-y-1">
                    {groupSessions.map((session) => (
                      <div
                        key={session.id}
                        className={cn(
                          "group relative flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-150",
                          currentSessionId === session.id
                            ? "bg-primary/15 text-primary"
                            : "hover:bg-muted/50 text-foreground"
                        )}
                        onClick={() => onSelectSession(session.id)}
                      >
                        <MessageSquareIcon
                          className={cn(
                            "w-4 h-4 shrink-0",
                            currentSessionId === session.id
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        />
                        <div className="flex-1 min-w-0 pr-6">
                          <p className="text-sm font-medium truncate">
                            {session.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {session.preview}
                          </p>
                        </div>

                        {/* Delete Button - Always visible */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="absolute right-1 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(session.id);
                              }}
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border/50">
        <p className="text-xs text-center text-muted-foreground">
          Powered by <span className="text-primary font-medium">SeekDB</span> +{" "}
          <span className="text-primary font-medium">PowerMem</span>
        </p>
      </div>
    </div>
  );
}
