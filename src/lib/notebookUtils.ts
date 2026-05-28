/**
 * Convert tutor content into notebook entries.
 * Modular helpers for future Coze integration.
 */

import type {
  ExplanationContent,
  QuizContent,
  QuizOption,
  RepairContent,
  SummaryContent,
  TutorResponse,
} from "@/types/tutor";
import type { NotebookEntry } from "@/types/notebook";

let noteId = 0;
function nextNoteId() {
  noteId += 1;
  return `note-${Date.now()}-${noteId}`;
}

export function convertExplanationToNoteEntry(
  content: ExplanationContent,
  title = "Concept explanation"
): NotebookEntry {
  const contentText = [
    "## Definition",
    content.definition,
    "",
    "## Intuition",
    content.intuition,
    "",
    "## Example",
    content.example,
    "",
    "## Common mistake",
    content.commonMistake,
  ].join("\n");

  return {
    id: nextNoteId(),
    title,
    content: contentText,
    sourceType: "explanation",
    createdAt: new Date().toISOString(),
  };
}

function getCorrectAnswerText(content: QuizContent): string {
  const options = content.options ?? [];
  if (content.type === "single_choice") {
    const id = Array.isArray(content.correctAnswer)
      ? content.correctAnswer[0]
      : content.correctAnswer;
    const opt = options.find((o: QuizOption) => o.id === id);
    return opt ? `${id.toUpperCase()}) ${opt.text}` : String(content.correctAnswer);
  }
  if (content.type === "multiple_choice") {
    const ids = Array.isArray(content.correctAnswer) ? content.correctAnswer : [content.correctAnswer];
    return ids
      .map((id) => {
        const opt = options.find((o: QuizOption) => o.id === id);
        return opt ? `${id.toUpperCase()}) ${opt.text}` : id;
      })
      .join("\n");
  }
  return String(content.correctAnswer);
}

export function convertQuizToNoteEntry(
  content: QuizContent,
  title = "Quiz note",
  wrongAnswer?: string
): NotebookEntry {
  const correctText = getCorrectAnswerText(content);
  const contentText = [
    "## Question",
    content.question,
    "",
    "## Correct answer",
    correctText,
    wrongAnswer ? ["", "## What I got wrong", wrongAnswer].join("\n") : "",
    "",
    "## Explanation",
    content.explanation,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: nextNoteId(),
    title,
    content: contentText.trim(),
    sourceType: "quiz",
    createdAt: new Date().toISOString(),
  };
}

/** Create a wrong-question notebook entry from a quiz the user got wrong. */
export function convertWrongQuestionToNoteEntry(
  content: QuizContent,
  wrongAnswer: string,
  summary?: string,
  title?: string
): NotebookEntry {
  const correctText = getCorrectAnswerText(content);
  const contentText = [
    "## Question",
    content.question,
    "",
    "## My wrong answer",
    wrongAnswer,
    "",
    "## Correct answer",
    correctText,
    "",
    "## Explanation",
    content.explanation,
    summary ? ["", "## Why I might have made the mistake", summary].join("\n") : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: nextNoteId(),
    title: title ?? `Wrong Q: ${content.question.slice(0, 40)}${content.question.length > 40 ? "…" : ""}`,
    content: contentText.trim(),
    sourceType: "wrong_question",
    createdAt: new Date().toISOString(),
  };
}

export function convertRepairToNoteEntry(
  content: RepairContent,
  title = "Repair note",
  wrongAnswer?: string,
  question?: string
): NotebookEntry {
  const contentText = [
    question ? ["## Question", question, ""].join("\n") : "",
    wrongAnswer ? ["## What I got wrong", wrongAnswer, ""].join("\n") : "",
    "## Hint",
    content.hint,
    "",
    "## Feedback / Correct idea",
    content.feedback,
    "",
    "## Next step",
    content.nextStep,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: nextNoteId(),
    title,
    content: contentText.trim(),
    sourceType: "repair",
    createdAt: new Date().toISOString(),
  };
}

export function convertSummaryToNoteEntry(
  content: SummaryContent,
  title = "Session summary"
): NotebookEntry {
  const lines: string[] = [
    "## Covered topics",
    ...content.coveredTopics.map((t) => `- ${t}`),
    "",
  ];
  if (content.weakPoints.length > 0) {
    lines.push("## Weak points", ...content.weakPoints.map((t) => `- ${t}`), "");
  }
  if (content.recommendation) {
    lines.push(
      "## Recommendation",
      content.recommendation.title,
      content.recommendation.detail ? `\n${content.recommendation.detail}` : "",
      ""
    );
  }
  return {
    id: nextNoteId(),
    title,
    content: lines.join("\n").trim(),
    sourceType: "summary",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate a session summary note from current tutor response.
 * Can later be replaced with Coze-generated summary.
 */
export function generateSessionSummaryNote(response: TutorResponse): NotebookEntry {
  const topic =
    response.sessionSummary?.coveredTopics[0] ?? "Current topic";
  const weakLabel = response.weakTopic?.label ?? "None flagged";
  const nextTitle =
    response.nextRecommendation?.title ??
    response.sessionSummary?.recommendation?.title ??
    "Continue learning";
  const nextDetail =
    response.nextRecommendation?.detail ??
    response.sessionSummary?.recommendation?.detail ??
    "";

  const content = [
    "## Current topic",
    topic,
    "",
    "## Main concept learned",
    response.message,
    "",
    "## Weak topic",
    weakLabel,
    "",
    "## Suggested next step",
    nextTitle,
    nextDetail ? `\n${nextDetail}` : "",
    "",
    "## Session takeaway",
    response.sessionSummary?.coveredTopics?.length
      ? `Covered: ${response.sessionSummary.coveredTopics.join(", ")}`
      : "Review the concepts above.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: nextNoteId(),
    title: "Session Review Note",
    content: content.trim(),
    sourceType: "session_summary",
    createdAt: new Date().toISOString(),
  };
}
