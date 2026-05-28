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

export type TutorCardKind = "explanation" | "quiz" | "repair" | "summary";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAtIso: string;
}

export interface ExplanationCardModel {
  kind: "explanation";
  title: string;
  bullets: string[];
  keyTakeaway: string;
}

export interface QuizChoice {
  id: string;
  label: string;
  explanation: string;
}

export interface QuizCardModel {
  kind: "quiz";
  title: string;
  question: string;
  choices: QuizChoice[];
  correctChoiceId: string;
}

export interface RepairCardModel {
  kind: "repair";
  title: string;
  misconception: string;
  hintSteps: string[];
  fixedAnswer: string;
}

export interface SummaryCardModel {
  kind: "summary";
  title: string;
  whatYouLearned: string[];
  weakTopics: string[];
  nextRecommendation: string;
}

export type TutorCardModel =
  | ExplanationCardModel
  | QuizCardModel
  | RepairCardModel
  | SummaryCardModel;

export interface TutorSessionModel {
  id: string;
  topic: string;
  mode: TutorMode;
  learnerState: LearnerState;
  weakTopics: string[];
  nextRecommendation: string;
  messages: ChatMessage[];
  cards: TutorCardModel[];
}

