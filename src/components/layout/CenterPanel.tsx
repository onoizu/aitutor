"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { TutorResponse, QuizSession, RepairResult } from "@/types/tutor";
import type { NotebookEntry } from "@/types/notebook";
import type { CozeAgentPackage } from "@/types/agentPackage";
import type { LiveTurn } from "@/components/layout/MainLayout";
import LiveChat from "@/components/LiveChat";
import AgentStatusBar from "@/components/layout/AgentStatusBar";
import QuizPaginationView from "@/components/quiz/QuizPaginationView";
import CozeQuizView from "@/components/quiz/CozeQuizView";
import {
  DOCUMENT_ACCEPT,
  IMAGE_ACCEPT,
  formatFileSize,
  validateUploadFile,
} from "@/lib/uploadConstraints";

interface CenterPanelProps {
  response: TutorResponse;
  currentTopic?: string;
  currentGoal?: string;
  children?: ReactNode;
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

export default function CenterPanel({
  response,
  currentTopic,
  currentGoal,
  children,
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
  const [repairModeInQuiz, setRepairModeInQuiz] = useState(false);
  const [cozeRepairMode, setCozeRepairMode] = useState(false);

  const inCozeQuiz =
    Boolean(showCozeQuiz && displayMode === "quiz" && cozePackage?.quiz?.question && cozePackage.quiz.options.length > 0);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : ""),
    [imageFile],
  );

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const selectImage = (file?: File) => {
    if (!file) return;
    const error = validateUploadFile(file, "image");
    if (error) {
      setUploadError(error);
      return;
    }
    setUploadError("");
    setImageFile(file);
  };

  const selectDocument = (file?: File) => {
    if (!file) return;
    const error = validateUploadFile(file, "document");
    if (error) {
      setUploadError(error);
      return;
    }
    setUploadError("");
    setDocumentFile(file);
  };

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
    setUploadError("");
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

  return (
    <main className="order-1 flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-neutral-800/80 text-sm leading-relaxed shadow-[0_14px_48px_rgba(0,0,0,0.45)] lg:order-2">
      <header className="shrink-0 border-b border-white/10 px-4 py-3 md:px-5">
        <div className="mb-2 rounded-lg border border-white/12 bg-gradient-to-b from-white/[0.05] to-white/[0.02] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
            Current Learning Topic
          </p>
          <h2 className="mt-0.5 truncate text-lg font-semibold text-white md:text-xl">
            {currentTopic || "Adaptive AI Tutor"}
          </h2>
          {currentGoal && (
            <p className="mt-0.5 text-xs text-white/70">
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
          className="mb-2"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {inCozeQuiz && cozeRepairMode && (
            <p className="text-sm text-amber-200">Review the hint and select your answer again</p>
          )}
          {quizSession && quizSession.questions.length > 0 && repairModeInQuiz && (
            <p className="text-sm text-amber-200">Detailed hint provided — please select your answer again</p>
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
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3 md:px-5 md:py-4">
              <LiveChat turns={liveTurns} isGenerating={sending} onAddToNotes={onAddToNotes} onRequestHint={onRequestHint} />
              {children}
            </div>
          </>
        )}

        {/* Hide input footer during quiz mode */}
        {!inCozeQuiz && !(quizSession && quizSession.questions.length > 0) && (
        <footer className="shrink-0 border-t border-white/10 bg-neutral-900/35 px-4 py-3 md:px-5">
          {(imageFile || documentFile) && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {imageFile && (
                <div className="flex items-center gap-2">
                  <img
                    src={imagePreviewUrl}
                    alt="preview"
                    className="h-12 w-12 rounded-lg object-cover ring-1 ring-white/20"
                  />
                  <span className="max-w-[190px] truncate text-sm text-white">
                    {imageFile.name} · {formatFileSize(imageFile.size)}
                  </span>
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
                  <span className="max-w-[220px] truncate text-sm text-white">
                    {documentFile.name} · {formatFileSize(documentFile.size)}
                  </span>
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
              accept={IMAGE_ACCEPT}
              className="hidden"
              onChange={(e) => {
                selectImage(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <input
              ref={docInputRef}
              type="file"
              accept={DOCUMENT_ACCEPT}
              className="hidden"
              onChange={(e) => {
                selectDocument(e.target.files?.[0]);
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
                "Type a message, upload an image or document, press Enter to send…"
              }
              className="h-10 flex-1 rounded-xl border border-white/10 bg-neutral-900/80 px-3 text-sm text-white placeholder:text-white/50 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-60"
            />
            {sending && onCancelSend ? (
              <button
                type="button"
                onClick={onCancelSend}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-red-400/40 bg-red-500/15 px-4 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/25 hover:text-red-200"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
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
          {uploadError && (
            <p className="mt-2 text-xs text-red-200">{uploadError}</p>
          )}
        </footer>
        )}
      </section>
    </main>
  );
}
