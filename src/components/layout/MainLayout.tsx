"use client";

import type { ReactNode } from "react";
import type { TutorResponse, QuizSession, RepairResult } from "@/types/tutor";
import type { NotebookEntry } from "@/types/notebook";
import type { CozeAgentPackage } from "@/types/agentPackage";
import LeftSidebar from "@/components/layout/LeftSidebar";
import CenterPanel from "@/components/layout/CenterPanel";
import RightSidebar from "@/components/layout/RightSidebar";
import WorkbenchDrawer from "@/components/notebook/WorkbenchDrawer";

export type LiveTurn =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "tutor";
      text: string;
      response: TutorResponse;
      /** Markdown in bubble only — no cards (e.g. session welcome). */
      plainMessage?: boolean;
    };

export interface AgentSessionItem {
  id: string;
  title: string;
  updatedAt: string;
}

export type LearningActionType =
  | "concept_overview"
  | "guided_examples"
  | "quiz_check"
  | "answer_repair"
  | "feynman_reflection"
  | "session_review"
  | "mind_map"
  | "study_plan_checkin";

interface MainLayoutProps {
  response: TutorResponse;
  children?: ReactNode;
  liveTurns?: LiveTurn[];
  onSendMessage?: (text: string, image?: File, document?: File) => Promise<void>;
  onCancelSend?: () => void;
  onRequestHint?: (wrongAnswer: string, question: string) => void;
  /** Learning Notebook */
  notebookEntries?: NotebookEntry[];
  onAddNotebookEntry?: (entry: NotebookEntry) => void;
  onUpdateNotebookEntry?: (id: string, content: string, title?: string) => void;
  onRemoveNotebookEntry?: (id: string) => void;
  onGenerateSummaryNote?: () => void;
  onCreateNote?: () => void;
  workbenchOpen?: boolean;
  onSetWorkbenchOpen?: (open: boolean) => void;
  /** Quiz pagination */
  quizSession?: QuizSession | null;
  onRequestRepair?: (wrongAnswer: string, question: string) => Promise<RepairResult | null>;
  onRequestCorrectAfterRepair?: (
    question: string,
    wrongAnswer: string,
    correctAnswer: string,
    explanation: string,
  ) => Promise<import("@/types/tutor").TutorResponse | null>;
  onQuizComplete?: () => void;
  sessions?: AgentSessionItem[];
  activeSessionId?: string;
  onSwitchSession?: (sessionId: string) => void;
  onCreateSession?: () => void;
  onRenameSession?: (sessionId: string, title: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onLearningAction?: (action: LearningActionType) => void;
  currentTopic?: string;
  currentGoal?: string;
  /** Coze 约定 JSON 解析结果（Study Studio 与各模式优先使用） */
  cozePackage?: CozeAgentPackage | null;
  /** teach：常规对话；quiz：仅测验卡片（由父组件结合 cozePackage 决定） */
  displayMode?: "teach" | "quiz";
  showCozeQuiz?: boolean;
  onCozeQuizExit?: () => void;
  onCozeCorrectAfterRepair?: (payload: {
    question: string;
    wrongAnswer: string;
    correctAnswer: string;
    explanation: string;
  }) => Promise<void>;
}

export default function MainLayout({
  response,
  children,
  liveTurns = [],
  onSendMessage,
  onCancelSend,
  onRequestHint,
  notebookEntries = [],
  onAddNotebookEntry,
  onUpdateNotebookEntry,
  onRemoveNotebookEntry,
  onGenerateSummaryNote,
  onCreateNote,
  workbenchOpen = false,
  onSetWorkbenchOpen,
  quizSession,
  onRequestRepair,
  onRequestCorrectAfterRepair,
  onQuizComplete,
  sessions = [],
  activeSessionId,
  onSwitchSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
  onLearningAction,
  currentTopic,
  currentGoal,
  cozePackage,
  displayMode = "teach",
  showCozeQuiz = false,
  onCozeQuizExit,
  onCozeCorrectAfterRepair,
}: MainLayoutProps) {
  const modeLabel =
    displayMode === "quiz"
      ? "Quiz Mode"
      : response.mode === "teach"
        ? "Teach Mode"
        : response.mode === "quiz"
          ? "Quiz Mode"
          : response.mode === "repair"
            ? "Repair Mode"
            : "Review Mode";

  const primaryTopic =
    currentTopic ??
    response.sessionSummary?.coveredTopics[0] ??
    "AI Tutor";

  return (
    <div className="h-dvh w-full overflow-hidden bg-black text-white">
      <div className="mx-auto grid h-full min-h-0 w-full max-w-[1720px] grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(140px,24%)_minmax(140px,24%)] gap-3 overflow-hidden px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 md:gap-5 md:px-5 md:py-4 lg:grid-cols-[minmax(250px,19%)_minmax(0,58%)_minmax(320px,23%)] lg:grid-rows-1 lg:gap-5 xl:gap-6">
        <LeftSidebar
          topic={primaryTopic}
          modeLabel={modeLabel}
          currentLearningGoals={response.currentLearningGoals}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSwitchSession={onSwitchSession}
          onCreateSession={onCreateSession}
          onRenameSession={onRenameSession}
          onDeleteSession={onDeleteSession}
          onLearningAction={onLearningAction}
        />

        <CenterPanel
          response={response}
          currentTopic={primaryTopic}
          currentGoal={currentGoal}
          liveTurns={liveTurns}
          onSendMessage={onSendMessage}
          onCancelSend={onCancelSend}
          onRequestHint={onRequestHint}
          onAddToNotes={onAddNotebookEntry}
          quizSession={quizSession}
          onRequestRepair={onRequestRepair}
          onRequestCorrectAfterRepair={onRequestCorrectAfterRepair}
          onQuizComplete={onQuizComplete}
          cozePackage={cozePackage}
          displayMode={displayMode}
          showCozeQuiz={showCozeQuiz}
          onCozeQuizExit={onCozeQuizExit}
          onCozeCorrectAfterRepair={onCozeCorrectAfterRepair}
        >
          {children}
        </CenterPanel>

        <RightSidebar
          response={response}
          cozePackage={cozePackage}
          notebookEntries={notebookEntries}
          onUpdateNotebookEntry={onUpdateNotebookEntry}
          onRemoveNotebookEntry={onRemoveNotebookEntry}
          onGenerateSummaryNote={onGenerateSummaryNote}
          onCreateNote={onCreateNote}
          onOpenWorkbench={onSetWorkbenchOpen ? () => onSetWorkbenchOpen(true) : undefined}
        />
      </div>

      {onSetWorkbenchOpen && onUpdateNotebookEntry && (
        <WorkbenchDrawer
          isOpen={workbenchOpen}
          onClose={() => onSetWorkbenchOpen(false)}
          entries={notebookEntries}
          onUpdateEntry={onUpdateNotebookEntry}
          onRemoveEntry={onRemoveNotebookEntry}
        />
      )}
    </div>
  );
}
