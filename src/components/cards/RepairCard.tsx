"use client";

import type { RepairContent } from "@/types/tutor";
import type { NotebookEntry } from "@/types/notebook";
import { convertRepairToNoteEntry } from "@/lib/notebookUtils";
import AddToNotesButton from "@/components/notebook/AddToNotesButton";

interface RepairCardProps {
  content: RepairContent;
  title?: string;
  /** Optional: student's wrong answer to show on the left (contrast layout) */
  wrongAnswer?: string;
  /** Optional: the quiz question for context and for notes */
  question?: string;
  onAddToNotes?: (entry: NotebookEntry) => void;
}

export default function RepairCard({
  content,
  title = "🔧 Repair",
  wrongAnswer,
  question,
  onAddToNotes,
}: RepairCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 shadow-xl backdrop-blur-sm ring-1 ring-white/5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-white/70">Hint and a guided next step.</p>
        </div>
        {onAddToNotes && (
          <AddToNotesButton
            onClick={() => onAddToNotes(convertRepairToNoteEntry(content, title, wrongAnswer, question))}
          />
        )}
      </header>

      {question && (
        <div className="mb-4 rounded-xl border border-white/15 bg-neutral-800/60 p-3 ring-1 ring-white/10">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
            Question
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-white">{question}</p>
        </div>
      )}

      {content.feedback && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 ring-1 ring-amber-400/20">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-200">
            Feedback
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-amber-100">{content.feedback}</p>
        </div>
      )}

      {/* Contrast layout: wrong answer (left) vs hint / guidance (right) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 ring-1 ring-red-400/20">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-red-200">
            Your answer
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-red-100">
            {wrongAnswer ?? "(Wrong answer was selected)"}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-neutral-800/60 p-3 ring-1 ring-white/10">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
            Detailed hint
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-white">{content.hint}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 ring-1 ring-emerald-400/20">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-100">
            Next step
          </div>
          <p className="mt-1.5 leading-relaxed text-emerald-100">{content.nextStep}</p>
        </div>
      </div>
    </section>
  );
}
