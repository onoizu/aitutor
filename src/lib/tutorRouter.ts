/**
 * Mode detection and prompt dispatch.
 * Decides the tutor mode BEFORE calling the LLM so each call uses a tailored prompt.
 */

import type { ChatMessage } from "./modelClient";
import type { TutorSessionState } from "./tutorSession";
import {
  buildExplainPrompt,
  buildQuizPrompt,
  buildQuizEvalPrompt,
  buildRepairPrompt,
  buildReviewPrompt,
  buildMindMapPrompt,
} from "./tutorPrompts";

export type DetectedMode =
  | "teach"
  | "quiz"
  | "quiz_answer"
  | "repair"
  | "review"
  | "mindmap";

/* ------------------------------------------------------------------ */
/*  Keyword sets for heuristic mode detection                          */
/* ------------------------------------------------------------------ */

const QUIZ_KEYWORDS =
  /\b(quiz|test\s+me|question|练习|测试|出题|考考我|来道题|做题)\b/i;

const REVIEW_KEYWORDS =
  /\b(review|summary|summarise|summarize|总结|回顾|复习|session\s+summary)\b/i;

const MINDMAP_KEYWORDS =
  /\b(思维导图|总结思维导图|画个思维导图|mind\s*map|mindmap)\b/i;

const REPAIR_KEYWORDS =
  /\b(hint|help|don'?t\s+understand|confused|不懂|不理解|为什么不对|提示|帮助)\b/i;

/* ------------------------------------------------------------------ */
/*  detectMode                                                          */
/* ------------------------------------------------------------------ */

export function detectMode(
  session: TutorSessionState,
  userMessage: string,
): DetectedMode {
  const trimmed = userMessage.trim();

  // If there's a pending quiz and the message looks like a short answer, evaluate it.
  if (session.latestQuiz) {
    const isShort = trimmed.length < 120;
    const isOptionLetter = /^[a-dA-D]$/i.test(trimmed);
    const mentionsAnswer =
      /^(my\s+answer|answer|选|我选|我的答案)/i.test(trimmed);
    if (isShort && (isOptionLetter || mentionsAnswer || !QUIZ_KEYWORDS.test(trimmed))) {
      return "quiz_answer";
    }
  }

  if (MINDMAP_KEYWORDS.test(trimmed)) return "mindmap";
  if (REVIEW_KEYWORDS.test(trimmed)) return "review";
  if (QUIZ_KEYWORDS.test(trimmed)) return "quiz";
  if (session.previousMode === "repair" && REPAIR_KEYWORDS.test(trimmed))
    return "repair";

  return "teach";
}







/* ------------------------------------------------------------------ */
/*  buildPromptForMode                                                  */
/* ------------------------------------------------------------------ */

export function buildPromptForMode(
  mode: DetectedMode,
  session: TutorSessionState,
  userMessage: string,
): ChatMessage[] {
  switch (mode) {
    case "teach":
      return buildExplainPrompt(session, userMessage);
    case "quiz":
      return buildQuizPrompt(session, userMessage);
    case "quiz_answer":
      return buildQuizEvalPrompt(session, userMessage);
    case "repair":
      return buildRepairPrompt(session, userMessage);
    case "review":
      return buildReviewPrompt(session, userMessage);
    case "mindmap":
      return buildMindMapPrompt(session, userMessage);
  }
}
