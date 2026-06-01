"use client";

import type { QuizContent } from "@/types/tutor";
import type { NotebookEntry } from "@/types/notebook";
import type { WeakTopic, Recommendation } from "@/types/tutor";
import { convertWrongQuestionToNoteEntry } from "@/lib/notebookUtils";
import AddToNotesButton from "@/components/notebook/AddToNotesButton";

interface CorrectAfterRepairCardProps {
  question: QuizContent;
  wrongAnswer: string;
  summary: string;
  weakTopic: WeakTopic | null;
  nextRecommendation: Recommendation | null;
  onAddToNotes?: (entry: NotebookEntry) => void;
  onAddToWrongBook?: (entry: NotebookEntry) => void;
  onContinue: () => void;
}

export default function CorrectAfterRepairCard({
  question,
  wrongAnswer,
  summary,
  weakTopic,
  nextRecommendation,
  onAddToNotes,
  onAddToWrongBook,
  onContinue,
}: CorrectAfterRepairCardProps) {
  const wrongQuestionEntry = convertWrongQuestionToNoteEntry(
    question,
    wrongAnswer,
    summary,
    `Wrong Q: ${question.question.slice(0, 50)}${question.question.length > 50 ? "…" : ""}`,
  );

  const createSummaryNoteEntry = (): NotebookEntry => {
    return {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: `Summary: ${question.question.slice(0, 40)}${question.question.length > 40 ? "…" : ""}`,
      content: [
        "## Where You Might Have Gone Wrong",
        summary,
        "",
        "## Question",
        question.question,
        "",
        "## My Wrong Answer",
        wrongAnswer,
        "",
        "## Correct Answer",
        typeof question.correctAnswer === "string"
          ? question.options?.find((o) => o.id === question.correctAnswer)?.text ?? String(question.correctAnswer)
          : "",
        "",
        "## Explanation",
        question.explanation,
      ].join("\n"),
      sourceType: "repair",
      createdAt: new Date().toISOString(),
    };
  };

  return (
    <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 shadow-xl backdrop-blur-sm ring-1 ring-emerald-400/20">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-emerald-200">✓ Correct!</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-200 ring-1 ring-emerald-400/30">
          Summary
        </span>
      </header>

      <div className="space-y-4 text-sm">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200/90">
            Where You Might Have Gone Wrong
          </div>
          <p className="mt-1.5 leading-relaxed text-white">{summary}</p>
        </div>

        {weakTopic && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <span className="text-[11px] font-semibold text-amber-200">Weak Point: </span>
            <span className="text-amber-100">{weakTopic.label}</span>
          </div>
        )}

        {nextRecommendation && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-[11px] font-semibold text-white/80">Suggestion: </span>
            <span className="text-white">{nextRecommendation.title}</span>
            {nextRecommendation.detail && (
              <p className="mt-1 text-xs text-white/70">{nextRecommendation.detail}</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          {onAddToNotes && (
            <AddToNotesButton
              onClick={() => onAddToNotes(createSummaryNoteEntry())}
              label="Add to Notes"
            />
          )}
          {onAddToWrongBook && (
            <button
              type="button"
              onClick={() => onAddToWrongBook(wrongQuestionEntry)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/25"
            >
              <span>📒</span>
              Add to Wrong Book
            </button>
          )}
          <button
            type="button"
            onClick={onContinue}
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Continue Quiz →
          </button>
        </div>
      </div>
    </section>
  );
}
