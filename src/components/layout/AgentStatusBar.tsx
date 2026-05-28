"use client";

import type { TutorMode } from "@/types/tutor";
import { cn } from "@/lib/cn";

const MODES: { id: TutorMode; label: string; icon: string; iconColor: string }[] = [
  { id: "teach", label: "Teach", icon: "", iconColor: "text-blue-400" },
  { id: "quiz", label: "Quiz", icon: "", iconColor: "text-amber-400" },
  { id: "repair", label: "Repair", icon: "", iconColor: "text-orange-400" },
  { id: "review", label: "Review", icon: "", iconColor: "text-emerald-400" },
];

interface AgentStatusBarProps {
  currentMode: TutorMode;
  className?: string;
}

export default function AgentStatusBar({ currentMode, className }: AgentStatusBarProps) {
  return (
    <div
      className={cn(
        "agent-flow-scrollbar w-full overflow-x-auto overflow-y-hidden rounded-xl bg-gradient-to-b from-slate-800/90 via-indigo-950/55 to-slate-900/90 p-1.5 pb-2 ring-1 ring-indigo-400/25 shadow-inner shadow-black/20",
        className,
      )}
      role="list"
      aria-label="Guided learning flow: Teach, Quiz, Repair, Review"
    >
      <div className="flex w-max min-w-full items-stretch gap-1">
        {MODES.map((mode, index) => {
          const isActive = mode.id === currentMode;
          return (
            <div
              key={mode.id}
              role="listitem"
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all duration-200",
                isActive
                  ? "bg-indigo-500/30 text-white shadow-md ring-1 ring-indigo-300/40"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <span className={cn("text-sm", mode.iconColor, isActive && "badge-breathe")} aria-hidden>
                {mode.icon}
              </span>
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
