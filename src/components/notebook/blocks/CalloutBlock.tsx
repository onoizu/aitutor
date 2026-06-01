"use client";

import { useState } from "react";
import type { CalloutBlock as CalloutBlockType } from "@/types/notebook";

const VARIANT_STYLES: Record<
  CalloutBlockType["variant"],
  { bg: string; border: string; icon: string }
> = {
  info: { bg: "bg-blue-500/10", border: "border-blue-500/30", icon: "ℹ" },
  warning: { bg: "bg-amber-500/10", border: "border-amber-500/30", icon: "⚠" },
  tip: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: "💡" },
  definition: { bg: "bg-purple-500/10", border: "border-purple-500/30", icon: "📖" },
};

interface CalloutBlockProps {
  block: CalloutBlockType;
  onUpdate: (block: CalloutBlockType) => void;
}

export default function CalloutBlock({ block, onUpdate }: CalloutBlockProps) {
  const [content, setContent] = useState(block.content);

  const handleBlur = () => {
    if (content !== block.content) {
      onUpdate({ ...block, content });
    }
  };

  const style = VARIANT_STYLES[block.variant];

  return (
    <div
      className={`rounded-lg border ${style.border} ${style.bg} overflow-hidden`}
    >
      <div className="flex gap-2 p-3">
        <span className="shrink-0 text-lg" aria-hidden>
          {style.icon}
        </span>
        <div className="flex-1">
          <select
            value={block.variant}
            onChange={(e) =>
              onUpdate({
                ...block,
                variant: e.target.value as CalloutBlockType["variant"],
              })
            }
            className="mb-2 rounded border border-white/20 bg-neutral-800/80 text-xs text-white"
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="tip">Tip</option>
            <option value="definition">Definition</option>
          </select>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleBlur}
            placeholder="Callout content..."
            className="w-full min-h-[60px] resize-y bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
