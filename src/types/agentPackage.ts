/**
 * Coze 机器人系统提示词约定的 JSON 结构（与 Bot 侧 schema 对齐）。
 */

export interface CozeMainResponse {
  summary: string;
  definition?: string;
  intuition?: string;
  example?: string;
  commonMistake?: string;
}

export interface CozeQuizPayload {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  hint: string;
}

export interface CozeResourceItem {
  title: string;
  url: string;
  channel: string;
  description: string;
}

export interface CozeNoteEntry {
  title: string;
  content: string;
}

export interface CozeMindMapPayload {
  mermaidCode: string;
  title?: string;
}

export interface CozeAgentPackage {
  mode: string;
  learningState: string;
  weakTopic: string | { id?: string; label?: string } | null;
  mainResponse: CozeMainResponse;
  quiz: CozeQuizPayload | null;
  mindmap: CozeMindMapPayload | null;
  resources: CozeResourceItem[];
  nextRecommendation: string;
  noteEntry: CozeNoteEntry;
  sessionSummary: string;
}
