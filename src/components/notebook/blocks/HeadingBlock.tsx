"use client";

import { useState, useEffect } from "react";
import type { HeadingBlock as HeadingBlockType } from "@/types/notebook";

interface HeadingBlockProps {
  block: HeadingBlockType;
  onUpdate: (block: HeadingBlockType) => void;
}

const Tag = ({ level }: { level: 1 | 2 | 3 }) => {
  const sizes = { 1: "text-2xl", 2: "text-xl", 3: "text-lg" };
  const TagName = `h${level}` as "h1" | "h2" | "h3";
  return <TagName className={`font-semibold text-white ${sizes[level]}`} />;
};

export default function HeadingBlock({ block, onUpdate }: HeadingBlockProps) {
  const [content, setContent] = useState(block.content);

  useEffect(() => {
    setContent(block.content);
  }, [block.content]);

  const handleBlur = () => {
    if (content !== block.content) {
      onUpdate({ ...block, content });
    }
  };

  const sizes = { 1: "text-2xl", 2: "text-xl", 3: "text-lg" };

  return (
    <div className="rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2">
      <div className="flex items-center gap-2">
        <select
          value={block.level}
          onChange={(e) =>
            onUpdate({ ...block, level: Number(e.target.value) as 1 | 2 | 3 })
          }
          className="rounded border border-white/20 bg-neutral-800 text-sm text-white"
        >
          <option value={1}>H1</option>
          <option value={2}>H2</option>
          <option value={3}>H3</option>
        </select>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          placeholder="Heading..."
          className={`flex-1 bg-transparent font-semibold text-white placeholder:text-white/40 focus:outline-none ${sizes[block.level]}`}
        />
      </div>
    </div>
  );
}
