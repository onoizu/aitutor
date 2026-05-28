"use client";

import type { Block, BlockType } from "@/types/notebook";
import {
  getBlocksFromContent,
  serializeBlocksToContent,
  createBlock,
} from "@/lib/notebook/blockModel";
import BlockRenderer from "./BlockRenderer";
import BlockInsertMenu from "./BlockInsertMenu";

interface BlockListProps {
  content: string;
  onContentChange: (content: string) => void;
}

export default function BlockList({ content, onContentChange }: BlockListProps) {
  const blocks = getBlocksFromContent(content);

  function handleUpdate(index: number, block: Block) {
    const next = [...blocks];
    next[index] = block;
    onContentChange(serializeBlocksToContent(next));
  }

  function handleInsert(index: number, type?: BlockType) {
    const next = [...blocks];
    const newBlock = createBlock(type ?? "text", index);
    next.splice(index, 0, newBlock);
    // Re-order
    next.forEach((b, i) => (b.order = i));
    onContentChange(serializeBlocksToContent(next));
  }

  function handleDelete(index: number) {
    const next = blocks.filter((_, i) => i !== index);
    next.forEach((b, i) => (b.order = i));
    onContentChange(serializeBlocksToContent(next));
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => (
        <BlockRenderer
          key={block.id}
          block={block}
          onUpdate={(b) => handleUpdate(i, b)}
          onInsertBelow={() => handleInsert(i + 1)}
          onDelete={() => handleDelete(i)}
        />
      ))}
      <BlockInsertMenu onInsert={(type) => handleInsert(blocks.length, type)} />
    </div>
  );
}
