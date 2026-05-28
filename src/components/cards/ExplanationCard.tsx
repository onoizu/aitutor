"use client";

import type { ExplanationContent } from "@/types/tutor";
import type { NotebookEntry } from "@/types/notebook";
import { convertExplanationToNoteEntry } from "@/lib/notebookUtils";
import AddToNotesButton from "@/components/notebook/AddToNotesButton";
import MarkdownContent from "@/components/MarkdownContent";

interface ExplanationCardProps {
  content: ExplanationContent;
  title?: string;
  /** One-line hint under the title (mode-specific); omit for no subtitle */
  subtitle?: string;
  onAddToNotes?: (entry: NotebookEntry) => void;
}

export default function ExplanationCard({
  content,
  title = "📖 Teach",
  subtitle,
  onAddToNotes,
}: ExplanationCardProps) {
  const hasIntuition = !!content.intuition?.trim();
  const hasExample = !!content.example?.trim();
  const hasCommonMistake = !!content.commonMistake?.trim();

  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 shadow-xl backdrop-blur-sm ring-1 ring-white/5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-white/70">{subtitle}</p>
          ) : null}
        </div>
        {onAddToNotes && (
          <AddToNotesButton
            onClick={() => onAddToNotes(convertExplanationToNoteEntry(content, title))}
          />
        )}
      </header>

      <div className="space-y-4 text-sm">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
            Overview
          </div>
          <div className="mt-1.5">
            <MarkdownContent>{content.definition}</MarkdownContent>
          </div>
        </div>
        {hasIntuition && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
              Intuition
            </div>
            <div className="mt-1.5">
              <MarkdownContent>{content.intuition}</MarkdownContent>
            </div>
          </div>
        )}
        {hasExample && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
              Example
            </div>
            <div className="mt-1.5">
              <MarkdownContent>{content.example}</MarkdownContent>
            </div>
          </div>
        )}
        {hasCommonMistake && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 ring-1 ring-amber-400/20">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-200">
              Common mistake
            </div>
            <div className="mt-1.5">
              <MarkdownContent>{content.commonMistake}</MarkdownContent>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
