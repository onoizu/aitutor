"use client";

interface GenerateSummaryNoteButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

export default function GenerateSummaryNoteButton({
  onClick,
  disabled = false,
  label = "Generate Summary Note",
}: GenerateSummaryNoteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-xs font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span aria-hidden>📋</span>
      {label}
    </button>
  );
}
