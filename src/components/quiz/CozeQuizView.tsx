"use client";

import { useEffect, useMemo, useState } from "react";
import type { CozeNoteEntry, CozeQuizPayload } from "@/types/agentPackage";
import type { NotebookEntry } from "@/types/notebook";

const OPT_IDS = "abcdefghijklmnopqrstuvwxyz".split("");

interface CozeQuizViewProps {
  quiz: CozeQuizPayload;
  noteEntry?: CozeNoteEntry;
  onExit?: () => void;
  onAddToNotes?: (entry: NotebookEntry) => void;
  /** Called when the student answers correctly during repair to fetch tutor summary */
  onCorrectAfterRepair?: (payload: {
    question: string;
    wrongAnswer: string;
    correctAnswer: string;
    explanation: string;
  }) => Promise<void>;
  onRepairModeChange?: (inRepair: boolean) => void;
}

function optionRows(quiz: CozeQuizPayload) {
  return quiz.options.map((text, i) => ({
    id: OPT_IDS[i] ?? `o${i}`,
    text,
  }));
}

function isCorrectChoice(
  selectedId: string,
  quiz: CozeQuizPayload,
  options: { id: string; text: string }[],
): boolean {
  const ca = quiz.correctAnswer.trim();
  const sel = options.find((o) => o.id === selectedId);
  if (!sel) return false;
  if (!ca) return false;
  if (/^[a-z]$/i.test(ca)) {
    const idx = ca.toLowerCase().charCodeAt(0) - 97;
    return options[idx]?.id === selectedId;
  }
  const a = sel.text.trim().toLowerCase();
  const b = ca.toLowerCase();
  return a === b || b.includes(a) || a.includes(b);
}

function correctAnswerLabel(quiz: CozeQuizPayload, options: { id: string; text: string }[]) {
  const ca = quiz.correctAnswer.trim();
  if (!ca) return options[0]?.text ?? "";
  if (/^[a-z]$/i.test(ca)) {
    const idx = ca.toLowerCase().charCodeAt(0) - 97;
    return options[idx]?.text ?? ca;
  }
  return ca;
}

export default function CozeQuizView({
  quiz,
  noteEntry,
  onExit,
  onAddToNotes,
  onCorrectAfterRepair,
  onRepairModeChange,
}: CozeQuizViewProps) {
  const options = useMemo(() => optionRows(quiz), [quiz]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** pick | repair | done */
  const [phase, setPhase] = useState<"pick" | "repair" | "done">("pick");
  const [canRetry, setCanRetry] = useState(false);
  const [wrongLabel, setWrongLabel] = useState("");
  const [loadingFollowup, setLoadingFollowup] = useState(false);

  useEffect(() => {
    onRepairModeChange?.(phase === "repair");
    return () => onRepairModeChange?.(false);
  }, [phase, onRepairModeChange]);

  const handleSubmit = async () => {
    if (!selectedId) return;
    const ok = isCorrectChoice(selectedId, quiz, options);
    const selText = options.find((o) => o.id === selectedId)?.text ?? selectedId;

    if (ok) {
      if (phase === "repair" && onCorrectAfterRepair) {
        setLoadingFollowup(true);
        try {
          await onCorrectAfterRepair({
            question: quiz.question,
            wrongAnswer: wrongLabel,
            correctAnswer: correctAnswerLabel(quiz, options),
            explanation: quiz.explanation,
          });
        } finally {
          setLoadingFollowup(false);
        }
      }
      setPhase("done");
      onRepairModeChange?.(false);
      return;
    }

    if (phase === "pick") {
      setWrongLabel(selText);
      setPhase("repair");
      setCanRetry(false);
      setSelectedId(null);
      return;
    }
    setWrongLabel(selText);
    setCanRetry(false);
    setSelectedId(null);
  };

  const addNotesFromPkg = () => {
    if (!onAddToNotes) return;
    if (noteEntry?.title?.trim() && noteEntry?.content?.trim()) {
      onAddToNotes({
        id: `note-${Date.now()}`,
        title: noteEntry.title.trim(),
        content: noteEntry.content.trim(),
        sourceType: "quiz",
        createdAt: new Date().toISOString(),
      });
      return;
    }
    const correct = correctAnswerLabel(quiz, options);
    onAddToNotes({
      id: `note-${Date.now()}`,
      title: `Quiz: ${quiz.question.slice(0, 40)}${quiz.question.length > 40 ? "…" : ""}`,
      content: [
        "## Question",
        quiz.question,
        "",
        "## Explanation",
        quiz.explanation || "—",
        "",
        "## Correct Answer",
        correct,
        phase === "repair" || wrongLabel ? `\n## My Wrong Choice\n${wrongLabel || "—"}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      sourceType: "quiz",
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 shadow-xl ring-1 ring-white/5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-white">Practice Quiz</h2>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
            >
              Exit Quiz
            </button>
          )}
        </div>

        <p className="text-sm leading-relaxed text-white">{quiz.question}</p>

        <div className="mt-4 space-y-2">
          {options.map((opt) => {
            const selected = selectedId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={phase === "done" || loadingFollowup || (phase === "repair" && !canRetry)}
                onClick={() => setSelectedId(opt.id)}
                className={`flex w-full items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all disabled:cursor-default ${
                  phase === "done" && isCorrectChoice(opt.id, quiz, options)
                    ? "border-emerald-400/50 bg-emerald-500/15 text-white ring-1 ring-emerald-400/30"
                    : selected
                      ? "border-white/35 bg-white/15 text-white ring-1 ring-white/25"
                      : "border-white/10 bg-neutral-800/60 text-white hover:border-white/20"
                }`}
              >
                <span>{opt.text}</span>
                <span className="shrink-0 text-[11px] text-white/60">{opt.id.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        {phase === "repair" && (
          <div className="mt-4 space-y-2 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-3 ring-1 ring-amber-400/20">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-200">
              Hint · Repair Mode
            </div>
            {quiz.explanation?.trim() && (
              <p className="text-sm leading-relaxed text-amber-50">{quiz.explanation}</p>
            )}
            {quiz.hint?.trim() && (
              <p className="text-sm text-amber-50/80">{quiz.hint}</p>
            )}
            {!quiz.explanation?.trim() && !quiz.hint?.trim() && (
              <p className="text-sm text-amber-50">Review the question and options carefully, then try again.</p>
            )}
            <p className="mt-1 text-xs text-white/70">Your previous choice: {wrongLabel || "—"}</p>
            {!canRetry && (
              <button
                type="button"
                onClick={() => {
                  setCanRetry(true);
                  setSelectedId(null);
                }}
                className="mt-2 rounded-xl border border-amber-200/40 bg-amber-100/10 px-3 py-2 text-sm font-semibold text-amber-50 hover:bg-amber-100/15"
              >
                Choose again
              </button>
            )}
          </div>
        )}

        {phase === "done" && (
          <div className="mt-4 space-y-3 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-4 py-4 ring-1 ring-emerald-400/25">
            <div className="flex items-center gap-2">
              <span className="text-lg text-emerald-400">✓</span>
              <span className="text-base font-semibold text-emerald-200">Correct!</span>
            </div>
            {wrongLabel && (
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70">
                <span className="font-medium text-white/90">Your first answer:</span>{" "}
                <span className="line-through text-red-300/70">{wrongLabel}</span>
                {" → "}
                <span className="text-emerald-300">{correctAnswerLabel(quiz, options)}</span>
              </div>
            )}
            {quiz.explanation && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200/80">Explanation</div>
                <p className="mt-1 text-sm leading-relaxed text-white/90">{quiz.explanation}</p>
              </div>
            )}
          </div>
        )}

        {phase !== "done" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!selectedId || loadingFollowup || (phase === "repair" && !canRetry)}
              onClick={handleSubmit}
              className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-45"
            >
              {loadingFollowup ? "Generating summary…" : phase === "repair" ? "Resubmit" : "Submit Answer"}
            </button>
            {onAddToNotes && phase === "repair" && (
              <button
                type="button"
                onClick={addNotesFromPkg}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
              >
                Add to Notes
            </button>
            )}
          </div>
        )}

        {phase === "done" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {onAddToNotes && (
              <button
                type="button"
                onClick={addNotesFromPkg}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
              >
                Add to Notes
              </button>
            )}
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Continue →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
