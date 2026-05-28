"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export function Badge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: "neutral" | "green" | "blue" | "amber" | "red" | "purple";
}) {
  const styles =
    variant === "green"
      ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30"
      : variant === "blue"
        ? "bg-sky-500/15 text-sky-200 ring-sky-500/30"
        : variant === "amber"
          ? "bg-amber-500/15 text-amber-200 ring-amber-500/30"
          : variant === "red"
            ? "bg-rose-500/15 text-rose-200 ring-rose-500/30"
            : variant === "purple"
              ? "bg-violet-500/15 text-violet-200 ring-violet-500/30"
              : "bg-white/10 text-zinc-200 ring-white/15";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset backdrop-blur",
        styles,
      )}
    >
      {children}
    </span>
  );
}

