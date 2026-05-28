"use client";

interface AddToNotesButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export default function AddToNotesButton({
  onClick,
  label = "Add to Notes",
  className = "",
}: AddToNotesButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/90 transition-colors hover:bg-white/15 hover:text-white ${className}`}
    >
      <span aria-hidden>📝</span>
      {label}
    </button>
  );
}
