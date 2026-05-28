import type { TutorResponse } from "@/types/tutor";

/** Minimal tutor state before any Coze response (UI placeholders). */
export function createInitialTutorResponse(): TutorResponse {
  return {
    intent: "explain_concept",
    learningState: "needs_example",
    mode: "teach",
    content: {
      contentType: "explanation",
      definition: "",
      intuition: "",
      example: "",
      commonMistake: "",
    },
    message: "",
    weakTopic: null,
    nextRecommendation: null,
    sessionSummary: null,
  };
}
