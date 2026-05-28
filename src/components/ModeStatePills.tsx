"use client";

import { Badge } from "@/components/ui/Badge";
import type { LearnerState, TutorMode } from "@/lib/types";

export function ModePill({ mode }: { mode: TutorMode }) {
  const { label, variant } = (() => {
    switch (mode) {
      case "teach":
        return { label: "Teach Mode", variant: "blue" as const };
      case "quiz":
        return { label: "Quiz Mode", variant: "purple" as const };
      case "repair":
        return { label: "Repair Mode", variant: "amber" as const };
      case "review":
        return { label: "Review Mode", variant: "green" as const };
    }
  })();

  return <Badge variant={variant}>{label}</Badge>;
}

export function LearnerStatePill({ state }: { state: LearnerState }) {
  const { label, variant } = (() => {
    switch (state) {
      case "confused_concept":
        return { label: "Confused concept", variant: "amber" as const };
      case "needs_example":
        return { label: "Needs example", variant: "blue" as const };
      case "ready_for_quiz":
        return { label: "Ready for quiz", variant: "green" as const };
      case "wrong_but_fixable":
        return { label: "Wrong but fixable", variant: "purple" as const };
      case "frustrated":
        return { label: "Frustrated", variant: "red" as const };
    }
  })();

  return <Badge variant={variant}>{label}</Badge>;
}

