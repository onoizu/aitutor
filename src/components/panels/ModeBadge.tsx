"use client";

import type { TutorMode } from "@/types/tutor";
import { cn } from "@/lib/cn";

interface ModeBadgeProps {
  mode: TutorMode;
}

const MODE_CONFIG: Record<
  TutorMode,
  { label: string; icon: string; iconColor: string; classes: string }
> = {
  teach: {
    label: "Teach",
    icon: "📖",
    iconColor: "text-blue-400",
    classes: "bg-white/15 text-white ring-white/30",
  },
  quiz: {
    label: "Quiz",
    icon: "⚡",
    iconColor: "text-amber-400",
    classes: "bg-white/15 text-white ring-white/30",
  },
  repair: {
    label: "Repair",
    icon: "🔧",
    iconColor: "text-orange-400",
    classes: "bg-white/15 text-white ring-white/30",
  },
  review: {
    label: "Review",
    icon: "✓",
    iconColor: "text-emerald-400",
    classes: "bg-white/15 text-white ring-white/30",
  },
  mindmap: {
    label: "Mind Map",
    icon: "🗺",
    iconColor: "text-violet-400",
    classes: "bg-white/15 text-white ring-white/30",
  },
};

export default function ModeBadge({ mode }: ModeBadgeProps) {
  const { label, icon, iconColor, classes } = MODE_CONFIG[mode];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset badge-breathe",
        classes,
      )}
    >
      <span className={iconColor} aria-hidden>{icon}</span>
      {label}
    </span>
  );
}

