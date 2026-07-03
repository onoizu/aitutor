"use client";

import type { TutorMode } from "@/types/tutor";
import { cn } from "@/lib/cn";

const MODES: { id: TutorMode; label: string }[] = [
  { id: "teach", label: "Teach" },
  { id: "quiz", label: "Quiz" },
  { id: "repair", label: "Repair" },
  { id: "review", label: "Review" },
];

interface AgentStatusBarProps {
  currentMode: TutorMode;
  className?: string;
}


export default function AgentStatusBar({ currentMode, className }: AgentStatusBarProps) {
  return (
    <div
      className={cn(
        "agent-flow-scrollbar w-full overflow-x-auto overflow-y-hidden rounded-lg bg-gradient-to-b from-slate-800/85 via-indigo-950/45 to-slate-900/85 p-1 pb-1.5 ring-1 ring-indigo-400/20 shadow-inner shadow-black/15",
        className,
      )}
      role="list"
      aria-label="Guided learning flow: Teach, Quiz, Repair, Review"
    >
      <div className="flex w-max min-w-full items-stretch gap-0.5">
        {MODES.map((mode, index) => {
          const isActive = mode.id === currentMode;
          return (
            <div
              key={mode.id}
              role="listitem"
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-all duration-200",
                isActive
                  ? "bg-indigo-500/30 text-white shadow-md ring-1 ring-indigo-300/40"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <span className="whitespace-nowrap">{mode.label}</span>
              {index < MODES.length - 1 && (
                <span className="ml-1 hidden shrink-0 text-white/40 md:inline" aria-hidden>
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
