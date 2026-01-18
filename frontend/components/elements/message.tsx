"use client";

import type { ComponentProps, HTMLAttributes } from "react";
import { memo } from "react";
import type { UIMessage } from "ai";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full max-w-[90%] flex-col gap-2",
      from === "user" ? "is-user ml-auto items-end" : "is-assistant items-start",
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      "flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm leading-relaxed",
      // User message styles - glassmorphism with purple gradient
      "group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-md group-[.is-user]:bg-gradient-to-br group-[.is-user]:from-violet-500 group-[.is-user]:to-purple-600 group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-white group-[.is-user]:shadow-lg",
      // Assistant message styles - glassmorphism card
      "group-[.is-assistant]:rounded-2xl group-[.is-assistant]:rounded-bl-md group-[.is-assistant]:bg-background/80 group-[.is-assistant]:backdrop-blur-md group-[.is-assistant]:border group-[.is-assistant]:border-border/50 group-[.is-assistant]:px-4 group-[.is-assistant]:py-3 group-[.is-assistant]:text-foreground group-[.is-assistant]:shadow-md",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose prose-sm prose-slate dark:prose-invert max-w-none",
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

MessageResponse.displayName = "MessageResponse";

export type MessageActionsProps = ComponentProps<"div">;

export const MessageActions = ({
  className,
  children,
  ...props
}: MessageActionsProps) => (
  <div
    className={cn(
      "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
      className
    )}
    {...props}
  >
    {children}
  </div>
);
