"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import MarkdownContent from "@/components/MarkdownContent";

type MessageRole = "user" | "tutor";

interface MessageBubbleProps {
  role: MessageRole;
  text?: string;
  children?: ReactNode;
}

export default function MessageBubble({ role, text, children }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-2.5 text-[15px] ring-1 ring-inset backdrop-blur-sm md:text-base",
          isUser
            ? "bg-white/15 text-white ring-white/25"
            : "bg-neutral-800/90 text-white ring-white/10",
        )}
      >
        {text ? (
          isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
          ) : (
            <MarkdownContent>{text}</MarkdownContent>
          )
        ) : null}
        {children ? <div className={text ? "mt-2" : ""}>{children}</div> : null}
      </div>
    </div>
  );
}
