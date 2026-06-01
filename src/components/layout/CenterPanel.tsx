"use client";

import { useState, useRef } from "react";
import type { ReactNode } from "react";
import type { TutorResponse, QuizSession, RepairResult } from "@/types/tutor";
import type { NotebookEntry } from "@/types/notebook";
import type { CozeAgentPackage } from "@/types/agentPackage";
import type { LiveTurn } from "@/components/layout/MainLayout";
import ChatWindow from "@/components/ChatWindow";
import LiveChat from "@/components/LiveChat";
import AgentStatusBar from "@/components/layout/AgentStatusBar";
import QuizPaginationView from "@/components/quiz/QuizPaginationView";
import CozeQuizView from "@/components/quiz/CozeQuizView";

interface CenterPanelProps {
  response: TutorResponse;
  currentTopic?: string;
  currentGoal?: string;
  children?: ReactNode;
  isDemoMode?: boolean;
  onExitDemo?: () => void;
  liveTurns?: LiveTurn[];
  onSendMessage?: (text: string, image?: File, document?: File) => Promise<void>;
  onCancelSend?: () => void;
  onAddToNotes?: (entry: NotebookEntry) => void;
  onRequestHint?: (wrongAnswer: string, question: string) => void;
  quizSession?: QuizSession | null;
  onRequestRepair?: (wrongAnswer: string, question: string) => Promise<RepairResult | null>;
  onRequestCorrectAfterRepair?: (
    question: string,
    wrongAnswer: string,
    correctAnswer: string,
    explanation: string,
  ) => Promise<TutorResponse | null>;
  onQuizComplete?: () => void;
  cozePackage?: CozeAgentPackage | null;
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

const QUICK_CARDS = [
  {
    label: "Examples",
    prompt: "Give me step-by-step examples for the current topic.",
  },
  {
    label: "Quiz",
    prompt: "Generate one multiple-choice quiz question for the current topic.",
  },
  {
    label: "Mindmap",
    prompt: "Create a mind map for the current topic.",
  },
  {
    label: "Review",
    prompt: "Summarize this session and suggest the next study step.",
  },
] as const;

export default function CenterPanel({
  response,
  currentTopic,
  currentGoal,
  children,
  isDemoMode = true,
  onExitDemo,
  liveTurns = [],
  onSendMessage,
  onCancelSend,
  onAddToNotes,
  onRequestHint,
  quizSession,
  onRequestRepair,
  onRequestCorrectAfterRepair,
  onQuizComplete,
  cozePackage,
  displayMode = "teach",
  showCozeQuiz = false,
  onCozeQuizExit,
  onCozeCorrectAfterRepair,
}: CenterPanelProps) {
  const nextRec =
    cozePackage?.nextRecommendation?.trim()
      ? {
          title: cozePackage.nextRecommendation.trim(),
          detail: undefined as string | undefined,
        }
      : (response.nextRecommendation ?? response.sessionSummary?.recommendation ?? null);
  const [repairModeInQuiz, setRepairModeInQuiz] = useState(false);
  const [cozeRepairMode, setCozeRepairMode] = useState(false);

  const inCozeQuiz =
    Boolean(showCozeQuiz && displayMode === "quiz" && cozePackage?.quiz?.question && cozePackage.quiz.options.length > 0);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    const text = inputValue.trim();
    const hasContent = text || imageFile || documentFile;
    if (!hasContent || !onSendMessage || sending) return;
    setSending(true);
    const img = imageFile ?? undefined;
    const doc = documentFile ?? undefined;
    setInputValue("");
    setImageFile(null);
    setDocumentFile(null);
    try {
      await onSendMessage(
        text || (img ? "Analyze this image" : doc ? "Answer based on this document" : ""),
        img,
        doc,
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const applyQuickCard = (prompt: string) => {
    setInputValue(prompt);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <main className="order-1 flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-neutral-800/80 text-[15px] leading-relaxed shadow-[0_14px_48px_rgba(0,0,0,0.45)] md:text-base lg:order-2">
      <header className="shrink-0 border-b border-white/10 px-4 py-4 md:px-6">
        <div className="mb-3 rounded-xl border border-white/15 bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-3 py-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
            Current Learning Topic
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-white md:text-[1.4rem]">
            {currentTopic || "Adaptive AI Tutor"}
          </h2>
          {currentGoal && (
            <p className="mt-1 text-base text-white/75">
              Focus: {currentGoal}
            </p>
          )}
        </div>
        <AgentStatusBar
          currentMode={
            inCozeQuiz
              ? cozeRepairMode
                ? "repair"
                : "quiz"
              : quizSession && quizSession.questions.length > 0
                ? repairModeInQuiz
                  ? "repair"
                  : "quiz"
                : displayMode === "teach" && response.mode === "quiz"
                  ? "teach"
                  : response.mode
          }
          className="mb-3"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {!inCozeQuiz && !(quizSession && quizSession.questions.length > 0) && (
            <p className="line-clamp-2 text-base text-white/90">
              {(() => {
                const raw = cozePackage?.mainResponse?.summary?.trim() || response.message;
                const firstLine = raw.split(/\n/)[0] ?? raw;
                return firstLine.length > 150 ? firstLine.slice(0, 150) + "…" : firstLine;
              })()}
            </p>
          )}
          {inCozeQuiz && cozeRepairMode && (
            <p className="text-base text-amber-200">Review the hint and select your answer again</p>
          )}
          {quizSession && quizSession.questions.length > 0 && repairModeInQuiz && (
            <p className="text-base text-amber-200">Detailed hint provided — please select your answer again</p>
          )}
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col">
        {inCozeQuiz && cozePackage?.quiz ? (
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
            <CozeQuizView
              quiz={cozePackage.quiz}
              noteEntry={cozePackage.noteEntry}
              onExit={onCozeQuizExit}
              onAddToNotes={onAddToNotes}
              onCorrectAfterRepair={
                onCozeCorrectAfterRepair
                  ? async (p) => {
                      await onCozeCorrectAfterRepair(p);
                    }
                  : undefined
              }
              onRepairModeChange={setCozeRepairMode}
            />
          </div>
        ) : quizSession && quizSession.questions.length > 0 ? (
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-white/60 uppercase tracking-wider">Quiz Mode</span>
              {onQuizComplete && (
                <button
                  type="button"
                  onClick={onQuizComplete}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Exit Quiz
                </button>
              )}
            </div>
            <QuizPaginationView
              quizSession={quizSession}
              onRequestRepair={onRequestRepair}
              onRequestCorrectAfterRepair={onRequestCorrectAfterRepair}
              onComplete={onQuizComplete}
              onAddToNotes={onAddToNotes}
              onRepairModeChange={setRepairModeInQuiz}
            />
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
              {isDemoMode ? (
                <>
                  <ChatWindow onAddToNotes={onAddToNotes} onRequestHint={onRequestHint} />
                  {onExitDemo && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={onExitDemo}
                        className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-base font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-white/15"
                      >
                        Exit demo, use live chat
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <LiveChat turns={liveTurns} isGenerating={sending} onAddToNotes={onAddToNotes} onRequestHint={onRequestHint} />
              )}
              {children}
            </div>

            {nextRec && (
              <div className="shrink-0 px-4 pb-2 md:px-6">
                <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white ring-1 ring-white/10">
                  <span className="font-medium text-white">Next: </span>
                  {nextRec.title}
                </div>
              </div>
            )}
          </>
        )}

        {/* Hide input footer during quiz mode */}
        {!inCozeQuiz && !(quizSession && quizSession.questions.length > 0) && (
        <footer className="shrink-0 border-t border-white/10 bg-neutral-900/35 px-4 py-3 md:px-6">
          <div className="mb-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {QUICK_CARDS.map((card) => (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => applyQuickCard(card.prompt)}
                  disabled={isDemoMode || sending}
                  className="shrink-0 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/85 transition-colors hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-white disabled:opacity-45"
                >
                  {card.label}
                </button>
              ))}
            </div>
          </div>
          {(imageFile || documentFile) && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {imageFile && (
                <div className="flex items-center gap-2">
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="preview"
                    className="h-12 w-12 rounded-lg object-cover ring-1 ring-white/20"
                  />
                  <span className="text-sm text-white">{imageFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setImageFile(null)}
                    className="text-sm text-white/80 hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              )}
              {documentFile && (
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-800/80 px-2 py-1.5">
                  <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm text-white">{documentFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setDocumentFile(null)}
                    className="text-sm text-white/80 hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f?.type.startsWith("image/")) setImageFile(f);
                e.target.value = "";
              }}
            />
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setDocumentFile(f);
                e.target.value = "";
              }}
            />
            <div className="group relative">
              <div className="pointer-events-none absolute left-0 top-0 z-20 hidden w-max max-w-[220px] -translate-y-[120%] rounded-lg border border-white/20 bg-white px-3 py-1.5 text-[13px] text-neutral-900 shadow-lg group-hover:block">
                Upload an image for visual tutoring.
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isDemoMode}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/15 text-white/85 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                title="Upload image"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <div className="group relative">
              <div className="pointer-events-none absolute left-0 top-0 z-20 hidden w-max max-w-[220px] -translate-y-[120%] rounded-lg border border-white/20 bg-white px-3 py-1.5 text-[13px] text-neutral-900 shadow-lg group-hover:block">
                Upload a PDF/DOC/TXT/MD file.
              </div>
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                disabled={isDemoMode}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/15 text-white/85 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                title="Upload document"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={
                isDemoMode
                  ? "Ask the tutor about this topic… (input disabled in demo mode)"
                  : "Type a message, upload an image or document, press Enter to send…"
              }
              disabled={isDemoMode}
              className="h-10 flex-1 rounded-xl border border-white/10 bg-neutral-900/80 px-3 text-base text-white placeholder:text-white/50 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-60"
            />
            {sending && onCancelSend ? (
              <button
                type="button"
                onClick={onCancelSend}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-red-400/40 bg-red-500/15 px-4 text-base font-semibold text-red-300 transition-colors hover:bg-red-500/25 hover:text-red-200"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={isDemoMode}
                aria-label="Send message"
                title="Send message"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/75 text-neutral-950 shadow-lg shadow-black/20 transition-all hover:bg-white/85 disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 19V6m0 0-5 5m5-5 5 5" />
                </svg>
              </button>
            )}
          </div>
        </footer>
        )}
      </section>
    </main>
  );
}
