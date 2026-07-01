export type TutorMode = "teach" | "quiz" | "repair" | "review";

export const TUTOR_MODES: Array<{ id: TutorMode; label: string }> = [
  { id: "teach", label: "Teach Mode" },
  { id: "quiz", label: "Quiz Mode" },
  { id: "repair", label: "Repair Mode" },
  { id: "review", label: "Review Mode" },
];

export type LearnerState =
  | "confused_concept"
  | "needs_example"
  | "ready_for_quiz"
  | "wrong_but_fixable"
  | "frustrated";

export const LEARNER_STATES: Array<{ id: LearnerState; label: string }> = [
  { id: "confused_concept", label: "Confused concept" },
  { id: "needs_example", label: "Needs example" },
  { id: "ready_for_quiz", label: "Ready for quiz" },
  { id: "wrong_but_fixable", label: "Wrong but fixable" },
  { id: "frustrated", label: "Frustrated" },
];

export type ChatRole = "student" | "tutor" | "system";
