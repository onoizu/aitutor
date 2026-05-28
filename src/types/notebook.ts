/**
 * Learning Notebook data model.
 * Supports block-based content for structured learning notes.
 */

export type NotebookSourceType =
  | "explanation"
  | "quiz"
  | "repair"
  | "summary"
  | "session_summary"
  | "manual"
  | "wrong_question";

export type BlockType =
  | "text"
  | "heading"
  | "code"
  | "table"
  | "chart"
  | "callout"
  | "annotation";

export interface BlockBase {
  id: string;
  type: BlockType;
  order: number;
}

export interface TextBlock extends BlockBase {
  type: "text";
  content: string;
}

export interface HeadingBlock extends BlockBase {
  type: "heading";
  level: 1 | 2 | 3;
  content: string;
}

export interface CodeBlock extends BlockBase {
  type: "code";
  language: string;
  code: string;
}

export interface TableBlock extends BlockBase {
  type: "table";
  headers: string[];
  rows: string[][];
}

export interface ChartBlock extends BlockBase {
  type: "chart";
  chartType: "bar" | "line" | "pie";
  data: { label: string; value: number }[];
  title?: string;
}

export interface CalloutBlock extends BlockBase {
  type: "callout";
  variant: "info" | "warning" | "tip" | "definition";
  content: string;
}

export interface AnnotationBlock extends BlockBase {
  type: "annotation";
  category: "key_point" | "definition" | "confusion" | "exam_point";
  targetBlockId?: string;
  content: string;
}

export type Block =
  | TextBlock
  | HeadingBlock
  | CodeBlock
  | TableBlock
  | ChartBlock
  | CalloutBlock
  | AnnotationBlock;

export interface NotebookEntry {
  id: string;
  title: string;
  /** Legacy: plain text. When blocks exist, content is serialized from blocks for backward compat. */
  content: string;
  sourceType?: NotebookSourceType;
  createdAt: string;
  updatedAt?: string;
}
