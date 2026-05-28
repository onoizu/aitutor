// Core enums / string unions

export type TutorMode = "teach" | "quiz" | "repair" | "review" | "mindmap";

export type TutorIntent =
  | "explain_concept"
  | "ask_question"
  | "repair_misconception"
  | "review_session";

export type LearnerState =
  | "confused_concept"
  | "needs_example"
  | "ready_for_quiz"
  | "wrong_but_fixable"
  | "frustrated";

export type TutorContentType = "explanation" | "quiz" | "repair" | "summary" | "mindmap";

export type QuizType = "single_choice" | "multiple_choice" | "free_response";

// Shared small models

export interface WeakTopic {
  id: string;
  label: string;
}

export interface Recommendation {
  id: string;
  title: string;
  detail?: string;
}

/** Resource item for recommended videos, articles, or docs (Coze-ready). */
export interface ResourceItem {
  type: "video" | "article" | "doc";
  title: string;
  source?: string;
  reason?: string;
  url?: string;
  thumbnail?: string;
}

export interface SessionSummary {
  coveredTopics: string[];
  weakPoints: string[];
  recommendation: Recommendation | null;
}

// Content payloads for each content type

export interface ExplanationContent {
  contentType: "explanation";
  definition: string;
  intuition: string;
  example: string;
  commonMistake: string;
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizContent {
  contentType: "quiz";
  question: string;
  type: QuizType;
  options: QuizOption[];
  /**
   * For `single_choice` and `multiple_choice`, refer to option ids.
   * For `free_response`, could be a rubric / reference answer.
   */
  correctAnswer: string | string[];
  explanation: string;
}

export interface RepairContent {
  contentType: "repair";
  feedback: string;
  hint: string;
  nextStep: string;
}

export interface SummaryContent {
  contentType: "summary";
  coveredTopics: string[];
  weakPoints: string[];
  recommendation: Recommendation | null;
}

export interface MindMapContent {
  contentType: "mindmap";
  mermaidCode: string;
  title?: string;
}

export type TutorContent =
  | ExplanationContent
  | QuizContent
  | RepairContent
  | SummaryContent
  | MindMapContent;

/** Returned by the repair handler so the quiz flow knows whether the answer was actually correct. */
export interface RepairResult {
  isCorrect: boolean;
  repair: RepairContent | null;
}

// Quiz session for batch/pagination mode
export interface QuizSession {
  questions: QuizContent[];
  currentIndex: number;
}

// Top-level tutor response model

export interface TutorMessage {
  role: "student" | "tutor" | "system";
  text: string;
  timestampIso: string;
}

export interface TutorResponse {
  /** High-level intent, independent of mode. */
  intent: TutorIntent;
  /** Current learner state classification. */
  learningState: LearnerState;
  /** Current tutor mode: Teach / Quiz / Repair / Review. */
  mode: TutorMode;
  /** Primary content block the UI should render. */
  content: TutorContent;
  /** One-line tutor-facing explanation of this turn. */
  message: string;
  /** Weak topic diagnostics for this turn. */
  weakTopic: WeakTopic | null;
  /** Next-step recommendation (could be null if not applicable). */
  nextRecommendation: Recommendation | null;
  /** Optional session-level summary after this turn. */
  sessionSummary: SessionSummary | null;
  /** Optional conversational trace for the UI (chat). */
  transcript?: TutorMessage[];
  /** Current learning goals for this session (Coze-ready). */
  currentLearningGoals?: string[];
  /** Recommended resources: videos, articles, etc. (Coze-ready). */
  recommendedResources?: ResourceItem[];
  /** Batch quiz session for pagination mode. */
  quizSession?: QuizSession;
}

