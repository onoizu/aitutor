"use client";

import { useRef, useEffect } from "react";
import type { TextBlock as TextBlockType } from "@/types/notebook";

interface TextBlockProps {
  block: TextBlockType;
  onUpdate: (block: TextBlockType) => void;
}

function toHtml(text: string): string {
  if (!text?.trim()) return "<p></p>";
  if (text.trim().startsWith("<")) return text;
  return `<p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
}

export default function TextBlock({ block, onUpdate }: TextBlockProps) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const target = toHtml(block.content || "");
    if (el.innerHTML !== target) {
      el.innerHTML = target;
    }
  }, [block.id, block.content]);

  const handleInput = () => {
    const el = elRef.current;
    if (!el) return;
    const html = el.innerHTML;
    if (html !== block.content) {
      onUpdate({ ...block, content: html });
    }
  };

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-neutral-800/80 px-2 py-1">
        <button
          type="button"
          onClick={() => document.execCommand("bold")}
          className="rounded px-2 py-1 text-sm font-bold text-white/90 hover:bg-white/15"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => document.execCommand("italic")}
          className="rounded px-2 py-1 text-sm italic text-white/90 hover:bg-white/15"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => document.execCommand("insertUnorderedList")}
          className="rounded px-2 py-1 text-sm text-white/90 hover:bg-white/15"
          title="Bullet list"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => document.execCommand("insertOrderedList")}
          className="rounded px-2 py-1 text-sm text-white/90 hover:bg-white/15"
          title="Numbered list"
        >
          1.
        </button>
        <button
          type="button"
          onClick={() => document.execCommand("formatBlock", false, "h2")}
          className="rounded px-2 py-1 text-xs font-medium text-white/90 hover:bg-white/15"
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => document.execCommand("formatBlock", false, "h3")}
          className="rounded px-2 py-1 text-xs font-medium text-white/90 hover:bg-white/15"
          title="Heading 3"
        >
          H3
        </button>
      </div>
      <div
        ref={elRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="min-h-[2em] px-3 py-2 text-base text-white prose prose-invert prose-sm max-w-none focus:outline-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded"
      />
    </div>
  );
}
