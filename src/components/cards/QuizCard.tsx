"use client";

import { useState } from "react";
import type { QuizContent, QuizOption } from "@/types/tutor";
import type { NotebookEntry } from "@/types/notebook";
import { convertQuizToNoteEntry } from "@/lib/notebookUtils";
import AddToNotesButton from "@/components/notebook/AddToNotesButton";

interface QuizCardProps {
  content: QuizContent;
  title?: string;
  onSubmitAnswer?: (answer: string | string[]) => void;
  onRequestHint?: (wrongAnswer: string, question: string) => void;
  onAddToNotes?: (entry: NotebookEntry) => void;
  wrongAnswer?: string;
}

export default function QuizCard({
  content,
  title = "⚡ Quiz",
  onSubmitAnswer,
  onRequestHint,
  onAddToNotes,
  wrongAnswer,
}: QuizCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [freeResponse, setFreeResponse] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [sentToCoze, setSentToCoze] = useState(false);
  const [wrongShake, setWrongShake] = useState(false);

  const locked = isCorrect || sentToCoze;

  function getAnswerString(): string {
    if (content.type === "free_response") return freeResponse.trim();
    return selectedOptionId ?? "";
  }

  function getAnswerLabel(): string {
    if (content.type === "free_response") return freeResponse.trim();
    if (!selectedOptionId) return "";
    const opt = content.options.find((o) => o.id === selectedOptionId);
    return opt ? `${opt.id.toUpperCase()}. ${opt.text}` : selectedOptionId.toUpperCase();
  }

  function handleSubmit() {
    const answer = getAnswerString();
    if (!answer) return;

    onSubmitAnswer?.(answer);

    const hasKnownAnswer =
      typeof content.correctAnswer === "string"
        ? content.correctAnswer.length > 0
        : Array.isArray(content.correctAnswer) && content.correctAnswer.length > 0;

    if (!hasKnownAnswer) {
      setSentToCoze(true);
      onRequestHint?.(getAnswerLabel(), content.question);
      return;
    }

    const correct =
      typeof content.correctAnswer === "string"
        ? answer === content.correctAnswer
        : Array.isArray(content.correctAnswer) && content.correctAnswer.includes(answer);

    if (correct) {
      setIsCorrect(true);
      return;
    }

    setAttempts((prev) => prev + 1);
    setWrongShake(true);
    setTimeout(() => setWrongShake(false), 400);
    setSelectedOptionId(null);

    onRequestHint?.(getAnswerLabel(), content.question);
  }

  const isChoice = content.type === "single_choice" || content.type === "multiple_choice";
  const canSubmit =
    !locked &&
    (content.type === "free_response"
      ? freeResponse.trim().length > 0
      : Boolean(selectedOptionId));

  function optionClasses(opt: QuizOption) {
    const selected = selectedOptionId === opt.id;

    if (isCorrect && selected) {
      return "border-emerald-400/50 bg-emerald-500/20 text-white ring-1 ring-emerald-400/40";
    }
    if (selected) {
      return "border-white/30 bg-white/15 text-white ring-1 ring-white/25";
    }
    return "border-white/10 bg-neutral-800/60 text-white hover:border-white/20 hover:bg-neutral-800/80";
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 shadow-xl backdrop-blur-sm ring-1 ring-white/5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-white/70">One question to check your understanding.</p>
        </div>
        {onAddToNotes && (
          <AddToNotesButton
            onClick={() => onAddToNotes(convertQuizToNoteEntry(content, title, wrongAnswer))}
          />
        )}
      </header>

      <div className={`space-y-4 text-sm ${wrongShake ? "animate-shake" : ""}`}>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
            Question
          </div>
          <p className="mt-1.5 leading-relaxed text-white">{content.question}</p>
        </div>

        {isChoice && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
              Options
            </div>
            <div className="mt-2 space-y-2">
              {content.options.map((opt: QuizOption) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={locked}
                  onClick={() => setSelectedOptionId(opt.id)}
                  className={`flex w-full items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all disabled:cursor-default ${optionClasses(opt)}`}
                >
                  <span>{opt.text}</span>
                  <span className="text-[11px] text-white/70">{opt.id.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {content.type === "free_response" && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
              Your answer
            </div>
            <textarea
              value={freeResponse}
              onChange={(e) => setFreeResponse(e.target.value)}
              rows={3}
              disabled={locked}
              className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-800/60 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-60"
              placeholder="Explain your reasoning in 1–3 sentences…"
            />
          </div>
        )}

        {/* Result banners */}
        {isCorrect && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2">
            <span className="text-emerald-400">✓</span>
            <span className="text-sm font-medium text-emerald-300">Correct!</span>
            {content.explanation && (
              <span className="ml-1 text-xs text-white/80">{content.explanation}</span>
            )}
          </div>
        )}

        {sentToCoze && !isCorrect && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/15 px-3 py-2">
            <span className="text-blue-400">↻</span>
            <span className="text-sm text-blue-300">
              Answer submitted — check the tutor response below.
            </span>
          </div>
        )}

        {!isCorrect && !sentToCoze && attempts > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/15 px-3 py-2">
            <span className="text-amber-400">✕</span>
            <span className="text-sm text-amber-300">
              Incorrect — review the hint and try again
            </span>
          </div>
        )}

        {/* Submit button */}
        {!locked && (
          <div className="pt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="btn-primary inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {attempts === 0 ? "Submit answer" : "Try again"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
