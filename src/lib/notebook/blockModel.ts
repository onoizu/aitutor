/**
 * Block serialization, migration, and factory helpers.
 */

import type { Block, TextBlock, CodeBlock, TableBlock } from "@/types/notebook";

const BLOCK_PREFIX = "nb-block:";

function isBlockJson(str: string): boolean {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every(
      (b: unknown) => typeof b === "object" && b != null && "type" in b && "id" in b
    );
  } catch {
    return false;
  }
}

/** Parse content string to blocks. Handles legacy plain text. */
export function getBlocksFromContent(content: string): Block[] {
  if (!content?.trim()) return [createTextBlock("", 0)];
  if (isBlockJson(content)) {
    const parsed = JSON.parse(content) as Record<string, unknown>[];
    return parsed.map((b, i) => ({ ...b, order: i }) as Block);
  }
  return [createTextBlock(content, 0)];
}

/** Serialize blocks to content string for storage. */
export function serializeBlocksToContent(blocks: Block[]): string {
  return JSON.stringify(blocks);
}

/** Create a new block with unique id. */
function blockId(): string {
  return `${BLOCK_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createTextBlock(content: string, order: number): TextBlock {
  return {
    id: blockId(),
    type: "text",
    order,
    content,
  };
}

export function createCodeBlock(language = "plaintext", code = "", order: number): CodeBlock {
  return {
    id: blockId(),
    type: "code",
    order,
    language,
    code,
  };
}

export function createTableBlock(
  headers: string[] = ["Column 1", "Column 2"],
  rows: string[][] = [["", ""]],
  order: number
): TableBlock {
  return {
    id: blockId(),
    type: "table",
    order,
    headers,
    rows,
  };
}

export function createHeadingBlock(
  level: 1 | 2 | 3,
  content: string,
  order: number
) {
  return {
    id: blockId(),
    type: "heading" as const,
    order,
    level,
    content,
  };
}

export function createCalloutBlock(
  variant: "info" | "warning" | "tip" | "definition",
  content: string,
  order: number
) {
  return {
    id: blockId(),
    type: "callout" as const,
    order,
    variant,
    content,
  };
}

/** Create a block by type. */
export function createBlock(type: Block["type"], order: number): Block {
  switch (type) {
    case "text":
      return createTextBlock("", order);
    case "heading":
      return createHeadingBlock(2, "Heading", order);
    case "code":
      return createCodeBlock("javascript", "// code here", order);
    case "table":
      return createTableBlock(["Col 1", "Col 2"], [["", ""]], order);
    case "callout":
      return createCalloutBlock("info", "Callout content", order);
    default:
      return createTextBlock("", order);
  }
}
