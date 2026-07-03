"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import MarkdownContent from "@/components/MarkdownContent";
import type { UploadedAttachment } from "@/lib/uploadConstraints";
import { formatFileSize } from "@/lib/uploadConstraints";

type MessageRole = "user" | "tutor";

interface MessageBubbleProps {
  role: MessageRole;
  text?: string;
  children?: ReactNode;
  attachments?: UploadedAttachment[];
}

function AttachmentPill({ attachment }: { attachment: UploadedAttachment }) {
  const iconPath =
    attachment.kind === "image"
      ? "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2 1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      : "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z";

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2 text-xs text-white/85">
      <svg className="h-4 w-4 shrink-0 text-white/75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
      </svg>
      <div className="min-w-0">
        <p className="truncate font-medium text-white">{attachment.name}</p>
        <p className="text-[11px] text-white/60">
          {attachment.kind === "image" ? "Image" : "Document"} · {formatFileSize(attachment.size)}
        </p>
      </div>
    </div>
  );
}

export default function MessageBubble({ role, text, children, attachments }: MessageBubbleProps) {
  const isUser = role === "user";
  const hasAttachments = Boolean(attachments?.length);

  return (
    <div
      className={cn(
        "flex",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ring-1 ring-inset backdrop-blur-sm",
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
        {hasAttachments && (
          <div className={cn("grid gap-2", text ? "mt-2" : "")}>
            {attachments!.map((attachment) => (
              <AttachmentPill key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}
        {children ? <div className={text || hasAttachments ? "mt-2" : ""}>{children}</div> : null}
      </div>
    </div>
  );
}
