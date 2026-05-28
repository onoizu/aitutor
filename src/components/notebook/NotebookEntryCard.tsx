"use client";

import { useState, useRef, useEffect } from "react";
import type { NotebookEntry } from "@/types/notebook";
import BlockList from "./BlockList";
import BlocksPreview from "./BlocksPreview";

const AUTO_SAVE_MS = 800;

interface NotebookEntryCardProps {
  entry: NotebookEntry;
  onUpdate: (id: string, content: string, title?: string) => void;
  onRemove?: (id: string) => void;
  /** When true, the content area expands to fill available space (used in Workbench). */
  expanded?: boolean;
  /** Register unsaved content for PDF export (Workbench only). */
  onRegisterContent?: (id: string, content: string, title?: string) => void;
  /** Clear registered content when not editing. */
  onClearContent?: (id: string) => void;
}

const sourceLabel: Record<string, string> = {
  explanation: "Explain",
  quiz: "Quiz",
  repair: "Repair",
  summary: "Summary",
  session_summary: "Review",
  manual: "Manual",
};

export default function NotebookEntryCard({
  entry,
  onUpdate,
  onRemove,
  expanded = false,
  onRegisterContent,
  onClearContent,
}: NotebookEntryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(entry.title);
  const [editContent, setEditContent] = useState(entry.content);

  function handleSave() {
    onUpdate(entry.id, editContent, editTitle);
    setIsEditing(false);
  }

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  // Debounced auto-save when content or title changes
  useEffect(() => {
    if (!isEditing) return;
    const timer = setTimeout(() => {
      if (editContent !== entry.content || editTitle !== entry.title) {
        onUpdate(entry.id, editContent, editTitle);
      }
    }, AUTO_SAVE_MS);
    return () => clearTimeout(timer);
  }, [isEditing, editContent, editTitle, entry.id, entry.content, entry.title, onUpdate]);

  // Register unsaved content for PDF export (so edits appear even before save)
  useEffect(() => {
    if (onRegisterContent && isEditing) {
      onRegisterContent(entry.id, editContent, editTitle);
    } else if (onClearContent && !isEditing) {
      onClearContent(entry.id);
    }
  }, [isEditing, editContent, editTitle, entry.id, onRegisterContent, onClearContent]);

  useEffect(() => {
    if (!isEditing) return;
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveRef.current();
      }
      if (e.key === "Escape") {
        setEditTitle(entry.title);
        setEditContent(entry.content);
        setIsEditing(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isEditing, entry.title, entry.content]);

  return (
    <div className="rounded-xl border border-white/10 bg-neutral-800/60 p-3 ring-1 ring-white/5">
      <div className="flex items-center justify-between gap-2 mb-2">
        {isEditing ? (
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 rounded border border-white/20 bg-neutral-900/80 px-2 py-1 text-base font-medium text-white"
          />
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base font-medium text-white truncate">{entry.title}</span>
            {entry.sourceType && (
              <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/70">
                {sourceLabel[entry.sourceType] ?? entry.sourceType}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                className="rounded px-2 py-1 text-xs font-medium text-white bg-white/20 hover:bg-white/30"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditTitle(entry.title);
                  setEditContent(entry.content);
                  setIsEditing(false);
                }}
                className="rounded px-2 py-1 text-xs text-white/70 hover:text-white"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded px-2 py-1 text-xs text-white/70 hover:text-white hover:bg-white/10"
            >
              Edit
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(entry.id)}
              className="rounded px-2 py-1 text-xs text-red-400/80 hover:text-red-400"
              title="Remove"
            >
              ×
            </button>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className={`rounded-lg overflow-hidden ${expanded ? "min-h-[60vh]" : ""}`}>
          <BlockList content={editContent} onContentChange={setEditContent} />
        </div>
      ) : (
        <BlocksPreview content={entry.content} expanded={expanded} />
      )}
    </div>
  );
}
