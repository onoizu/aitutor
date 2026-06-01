"use client";

import { useState } from "react";
import type { NotebookEntry } from "@/types/notebook";
import NotebookEntryCard from "./NotebookEntryCard";
import GenerateSummaryNoteButton from "./GenerateSummaryNoteButton";

interface LearningNotebookPanelProps {
  entries: NotebookEntry[];
  onUpdateEntry: (id: string, content: string, title?: string) => void;
  onRemoveEntry?: (id: string) => void;
  onGenerateSummary: () => void;
  onCreateNote?: () => void;
  onOpenWorkbench?: () => void;
}

export default function LearningNotebookPanel({
  entries,
  onUpdateEntry,
  onRemoveEntry,
  onGenerateSummary,
  onCreateNote,
  onOpenWorkbench,
}: LearningNotebookPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section className="rounded-xl bg-neutral-900/80 ring-1 ring-white/10">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90 hover:bg-white/5"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>📓</span>
          Learning Notebook
          {entries.length > 0 && (
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
              {entries.length}
            </span>
          )}
        </span>
        <span className="text-white/70">{isOpen ? "−" : "+"}</span>
      </button>
      {onOpenWorkbench && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenWorkbench(); }}
          className="flex w-full items-center justify-center gap-1.5 border-t border-white/10 px-3 py-2 text-[11px] font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open Workbench
        </button>
      )}
      {isOpen && (
        <div className="border-t border-white/10 px-3 py-3 space-y-3">
          <div className="flex items-center gap-2">
            {onCreateNote && (
              <button
                type="button"
                onClick={onCreateNote}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
              >
                <span aria-hidden>+</span> New Note
              </button>
            )}
            <div className={onCreateNote ? "flex-1" : "w-full"}>
              <GenerateSummaryNoteButton onClick={onGenerateSummary} label="Summarize Session" />
            </div>
          </div>
          <div className="space-y-2">
            {entries.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/60">
                No notes yet. Use &quot;Add to Notes&quot; on tutor cards to save content.
              </p>
            ) : (
              entries.map((entry) => (
                <NotebookEntryCard
                  key={entry.id}
                  entry={entry}
                  onUpdate={onUpdateEntry}
                  onRemove={onRemoveEntry}
                />
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
