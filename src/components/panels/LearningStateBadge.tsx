"use client";

import type { LearnerState } from "@/types/tutor";
import { cn } from "@/lib/cn";

interface LearningStateBadgeProps {
  state: LearnerState;
  /** 若提供，则直接显示模型返回的 learner 状态文案（如 Coze JSON 中的 learningState） */
  customLabel?: string;
}

export default function LearningStateBadge({ state, customLabel }: LearningStateBadgeProps) {
  if (customLabel?.trim()) {
    return (
      <span
        className={cn(
          "inline-flex max-w-[140px] items-center truncate rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
          "bg-white/10 text-white ring-white/20",
        )}
        title={customLabel.trim()}
      >
        {customLabel.trim()}
      </span>
    );
  }

  const { label, classes } = (() => {
    switch (state) {
      case "confused_concept":
        return {
          label: "Confused concept",
          classes: "bg-white/10 text-white ring-white/20",
        };
      case "needs_example":
        return {
          label: "Needs example",
          classes: "bg-white/10 text-white ring-white/20",
        };
      case "ready_for_quiz":
        return {
          label: "Ready for quiz",
          classes: "bg-white/10 text-white ring-white/20",
        };
      case "wrong_but_fixable":
        return {
          label: "Wrong but fixable",
          classes: "bg-white/10 text-white ring-white/20",
        };
      case "frustrated":
      default:
        return {
          label: "Frustrated",
          classes: "bg-white/10 text-white ring-white/20",
        };
    }
  })();

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset",
        classes,
      )}
    >
      {label}
    </span>
  );
}

