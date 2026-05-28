"use client";

import type { Block } from "@/types/notebook";
import TextBlock from "./blocks/TextBlock";
import HeadingBlock from "./blocks/HeadingBlock";
import CodeBlock from "./blocks/CodeBlock";
import TableBlock from "./blocks/TableBlock";
import CalloutBlock from "./blocks/CalloutBlock";

interface BlockRendererProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onInsertBelow: () => void;
  onDelete: () => void;
}

export default function BlockRenderer({
  block,
  onUpdate,
  onInsertBelow,
  onDelete,
}: BlockRendererProps) {
  const actions = (
    <div className="absolute -left-8 top-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        type="button"
        onClick={onInsertBelow}
        className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
        title="Add block below"
        aria-label="Add block below"
      >
        +
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-red-400"
        title="Delete block"
        aria-label="Delete block"
      >
        ×
      </button>
    </div>
  );

  switch (block.type) {
    case "text":
      return (
        <div className="group relative">
          {actions}
          <TextBlock block={block} onUpdate={onUpdate} />
        </div>
      );
    case "heading":
      return (
        <div className="group relative">
          {actions}
          <HeadingBlock block={block} onUpdate={onUpdate} />
        </div>
      );
    case "code":
      return (
        <div className="group relative">
          {actions}
          <CodeBlock block={block} onUpdate={onUpdate} />
        </div>
      );
    case "table":
      return (
        <div className="group relative">
          {actions}
          <TableBlock block={block} onUpdate={onUpdate} />
        </div>
      );
    case "callout":
      return (
        <div className="group relative">
          {actions}
          <CalloutBlock block={block} onUpdate={onUpdate} />
        </div>
      );
    case "chart":
    case "annotation":
      return (
        <div className="group relative">
          {actions}
          <div className="rounded-lg border border-white/10 bg-neutral-800/60 p-3 text-sm text-white/70">
            {block.type} block (coming soon)
          </div>
        </div>
      );
    default:
      return (
        <div className="group relative">
          {actions}
          <div className="rounded-lg border border-white/10 p-3 text-sm text-white/70">
            Unknown block type
          </div>
        </div>
      );
  }
}
