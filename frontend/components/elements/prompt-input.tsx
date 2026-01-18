"use client";

import type {
  ChangeEvent,
  ComponentProps,
  FormEvent,
  FormEventHandler,
  HTMLAttributes,
  KeyboardEventHandler,
} from "react";
import { useCallback, useRef, useState } from "react";
import type { ChatStatus } from "ai";
import { CornerDownLeftIcon, Loader2Icon, SquareIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

export interface PromptInputMessage {
  text: string;
}

export type PromptInputProps = Omit<
  HTMLAttributes<HTMLFormElement>,
  "onSubmit" | "onChange"
> & {
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>
  ) => void | Promise<void>;
  value?: string;
  onInputChange?: (value: string) => void;
};

export const PromptInput = ({
  className,
  onSubmit,
  value,
  onInputChange,
  children,
  ...props
}: PromptInputProps) => {
  const formRef = useRef<HTMLFormElement | null>(null);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const text = (formData.get("message") as string) || value || "";

    if (!text.trim()) return;

    onSubmit({ text }, event);
  };

  return (
    <form
      className={cn("w-full", className)}
      onSubmit={handleSubmit}
      ref={formRef}
      {...props}
    >
      <InputGroup className="overflow-hidden">{children}</InputGroup>
    </form>
  );
};

export type PromptInputBodyProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputBody = ({
  className,
  ...props
}: PromptInputBodyProps) => (
  <div className={cn("contents", className)} {...props} />
);

export type PromptInputTextareaProps = ComponentProps<
  typeof InputGroupTextarea
> & {
  value?: string;
  onValueChange?: (value: string) => void;
};

export const PromptInputTextarea = ({
  onChange,
  onKeyDown,
  value,
  onValueChange,
  className,
  placeholder = "Type a message...",
  ...props
}: PromptInputTextareaProps) => {
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    onKeyDown?.(e);

    if (e.defaultPrevented) return;

    if (e.key === "Enter") {
      if (isComposing || e.nativeEvent.isComposing) return;
      if (e.shiftKey) return;

      e.preventDefault();

      const form = e.currentTarget.form;
      const submitButton = form?.querySelector(
        'button[type="submit"]'
      ) as HTMLButtonElement | null;
      if (submitButton?.disabled) return;

      form?.requestSubmit();
    }
  };

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
      onValueChange?.(e.target.value);
    },
    [onChange, onValueChange]
  );

  return (
    <InputGroupTextarea
      className={cn("min-h-[60px] max-h-48", className)}
      name="message"
      onCompositionEnd={() => setIsComposing(false)}
      onCompositionStart={() => setIsComposing(true)}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      value={value}
      placeholder={placeholder}
      {...props}
    />
  );
};

export type PromptInputFooterProps = Omit<
  ComponentProps<typeof InputGroupAddon>,
  "align"
>;

export const PromptInputFooter = ({
  className,
  ...props
}: PromptInputFooterProps) => (
  <InputGroupAddon
    align="block-end"
    className={cn("justify-between gap-2", className)}
    {...props}
  />
);

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputTools = ({
  className,
  ...props
}: PromptInputToolsProps) => (
  <div className={cn("flex items-center gap-1", className)} {...props} />
);

export type PromptInputButtonProps = ComponentProps<typeof InputGroupButton>;

export const PromptInputButton = ({
  className,
  ...props
}: PromptInputButtonProps) => (
  <InputGroupButton className={cn(className)} {...props} />
);

export type PromptInputSubmitProps = ComponentProps<typeof InputGroupButton> & {
  status?: ChatStatus;
  onStop?: () => void;
};

export const PromptInputSubmit = ({
  className,
  variant = "default",
  size = "icon-sm",
  status,
  onStop,
  onClick,
  children,
  ...props
}: PromptInputSubmitProps) => {
  const isGenerating = status === "submitted" || status === "streaming";

  let Icon = <CornerDownLeftIcon className="size-4" />;

  if (status === "submitted") {
    Icon = <Loader2Icon className="size-4 animate-spin" />;
  } else if (status === "streaming") {
    Icon = <SquareIcon className="size-4" />;
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isGenerating && onStop) {
      e.preventDefault();
      onStop();
      return;
    }
    onClick?.(e);
  };

  return (
    <InputGroupButton
      aria-label={isGenerating ? "Stop" : "Submit"}
      className={cn(
        "rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
        className
      )}
      onClick={handleClick}
      size={size}
      type={isGenerating && onStop ? "button" : "submit"}
      variant={variant}
      {...props}
    >
      {children ?? Icon}
    </InputGroupButton>
  );
};
