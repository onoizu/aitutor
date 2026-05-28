"use client";

import { useEffect, useRef, useCallback } from "react";
import type { NotebookEntry } from "@/types/notebook";
import { buildNotebookPrintDocument } from "@/lib/notebook/printHtml";
import NotebookEntryCard from "./NotebookEntryCard";

const sourceLabel: Record<string, string> = {
  explanation: "Explain",
  quiz: "Quiz",
  repair: "Repair",
  summary: "Summary",
  session_summary: "Review",
  manual: "Manual",
};

interface WorkbenchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entries: NotebookEntry[];
  onUpdateEntry: (id: string, content: string, title?: string) => void;
  onRemoveEntry?: (id: string) => void;
}

export default function WorkbenchDrawer({
  isOpen,
  onClose,
  entries,
  onUpdateEntry,
  onRemoveEntry,
}: WorkbenchDrawerProps) {
  const latestContentRef = useRef<Record<string, { content: string; title?: string }>>({});

  const registerContent = useCallback((id: string, content: string, title?: string) => {
    latestContentRef.current[id] = { content, title };
  }, []);

  const clearContent = useCallback((id: string) => {
    delete latestContentRef.current[id];
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleExportPdf() {
    const getContent = (entry: NotebookEntry) => {
      const latest = latestContentRef.current[entry.id];
      return latest ? latest.content : entry.content;
    };
    const getTitle = (entry: NotebookEntry) => {
      const latest = latestContentRef.current[entry.id];
      return latest?.title ?? entry.title;
    };

    /**
     * Print from a hidden iframe with empty <title> and no app URL in the document.
     * This avoids main-window headers like site title + localhost in exported PDF.
     * If Chrome still shows date/URL, turn off "Headers and footers" in the print dialog.
     */
    const html = buildNotebookPrintDocument(entries, getContent, getTitle, sourceLabel);

    const iframe = document.createElement("iframe");
    iframe.setAttribute(
      "style",
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none",
    );
    iframe.setAttribute("title", "Print preview");
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) {
      iframe.remove();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const cleanup = () => {
      iframe.remove();
    };

    win.addEventListener("afterprint", cleanup, { once: true });
    setTimeout(cleanup, 120_000);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        win.focus();
        win.print();
      });
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 print:hidden"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="relative ml-auto flex h-full w-[65vw] max-w-[900px] min-w-[360px] flex-col bg-neutral-900 shadow-2xl ring-1 ring-white/10 animate-slide-in-right">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4 print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-lg" aria-hidden>📓</span>
            <h2 className="text-base font-semibold text-white">Learning Workbench</h2>
            {entries.length > 0 && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
                {entries.length} {entries.length === 1 ? "note" : "notes"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={entries.length === 0}
              title="Save as PDF: in the print dialog, disable Headers and footers for a clean file"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export as PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close workbench"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {entries.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-base text-white/50">
                No notes yet. Use &quot;Add to Notes&quot; on tutor cards to save content.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div key={entry.id} className="workbench-entry">
                  <NotebookEntryCard
                    entry={entry}
                    onUpdate={onUpdateEntry}
                    onRemove={onRemoveEntry}
                    expanded
                    onRegisterContent={registerContent}
                    onClearContent={clearContent}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
