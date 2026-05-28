"use client";

import { useCallback } from "react";

type MarkdownType = "bold" | "italic" | "h2" | "h3" | "list" | "code";

const WRAP_MAP: Record<MarkdownType, { before: string; after: string }> = {
  bold: { before: "**", after: "**" },
  italic: { before: "*", after: "*" },
  h2: { before: "## ", after: "" },
  h3: { before: "### ", after: "" },
  list: { before: "- ", after: "" },
  code: { before: "```\n", after: "\n```" },
};

interface FormatToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}

export default function FormatToolbar({
  textareaRef,
  value,
  onChange,
}: FormatToolbarProps) {
  const insertMarkdown = useCallback(
    (type: MarkdownType) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { before, after } = WRAP_MAP[type];
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.slice(start, end);

      let newText: string;
      let newCursorStart: number;
      let newCursorEnd: number;

      if (selectedText) {
        newText = value.slice(0, start) + before + selectedText + after + value.slice(end);
        newCursorStart = start + before.length;
        newCursorEnd = end + before.length;
      } else {
        const placeholder = type === "h2" || type === "h3" ? "Heading" : type === "list" ? "Item" : type === "code" ? "code" : "text";
        newText = value.slice(0, start) + before + placeholder + after + value.slice(start);
        newCursorStart = start + before.length;
        newCursorEnd = newCursorStart + placeholder.length;
      }

      onChange(newText);
      textarea.focus();
      requestAnimationFrame(() => {
        textarea.setSelectionRange(newCursorStart, newCursorEnd);
      });
    },
    [textareaRef, value, onChange],
  );

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-white/10 bg-neutral-800/80 px-2 py-1.5">
      <button
        type="button"
        onClick={() => insertMarkdown("bold")}
        className="rounded px-2 py-1 text-sm font-bold text-white/90 hover:bg-white/15"
        title="Bold"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => insertMarkdown("italic")}
        className="rounded px-2 py-1 text-sm italic text-white/90 hover:bg-white/15"
        title="Italic"
      >
        I
      </button>
      <span className="mx-1 h-4 w-px bg-white/20" aria-hidden />
      <button
        type="button"
        onClick={() => insertMarkdown("h2")}
        className="rounded px-2 py-1 text-xs font-medium text-white/90 hover:bg-white/15"
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => insertMarkdown("h3")}
        className="rounded px-2 py-1 text-xs font-medium text-white/90 hover:bg-white/15"
        title="Heading 3"
      >
        H3
      </button>
      <span className="mx-1 h-4 w-px bg-white/20" aria-hidden />
      <button
        type="button"
        onClick={() => insertMarkdown("list")}
        className="rounded px-2 py-1 text-sm text-white/90 hover:bg-white/15"
        title="Bullet list"
      >
        −
      </button>
      <button
        type="button"
        onClick={() => insertMarkdown("code")}
        className="rounded px-2 py-1 text-xs font-mono text-white/90 hover:bg-white/15"
        title="Code block"
      >
        {"</>"}
      </button>
    </div>
  );
}
