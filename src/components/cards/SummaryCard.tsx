"use client";

import type { SummaryContent } from "@/types/tutor";
import type { NotebookEntry } from "@/types/notebook";
import { convertSummaryToNoteEntry } from "@/lib/notebookUtils";
import AddToNotesButton from "@/components/notebook/AddToNotesButton";

interface SummaryCardProps {
  content: SummaryContent;
  title?: string;
  onAddToNotes?: (entry: NotebookEntry) => void;
}

export default function SummaryCard({
  content,
  title = "✓ Review",
  onAddToNotes,
}: SummaryCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 shadow-xl backdrop-blur-sm ring-1 ring-white/5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-white/70">
            Recap, weak points, and next recommendation.
          </p>
        </div>
        {onAddToNotes && (
          <AddToNotesButton
            onClick={() => onAddToNotes(convertSummaryToNoteEntry(content, title))}
          />
        )}
      </header>

      <div className="space-y-4 text-xs">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
            Covered topics
          </div>
          <ul className="mt-1.5 space-y-1">
            {content.coveredTopics.map((t) => (
              <li key={t} className="flex gap-1.5">
                <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-white/80" />
                <span className="leading-relaxed text-white">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {content.weakPoints.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
              Weak points
            </div>
            <ul className="mt-1.5 space-y-1">
              {content.weakPoints.map((t) => (
                <li key={t} className="flex gap-1.5">
                  <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/80" />
                  <span className="leading-relaxed text-white">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-neutral-800/60 p-3 ring-1 ring-white/5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
            Recommendation
          </div>
          {content.recommendation ? (
            <div className="mt-1.5 space-y-1 text-white">
              <div className="font-medium">{content.recommendation.title}</div>
              {content.recommendation.detail && (
                <p className="text-[11px] text-white/90">{content.recommendation.detail}</p>
              )}
            </div>
          ) : (
            <p className="mt-1.5 text-[11px] text-white/80">
              A next-step recommendation will appear once the tutor completes the current unit.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
