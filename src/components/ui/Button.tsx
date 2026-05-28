"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export function Button({
  className,
  variant = "secondary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-0 disabled:opacity-50 disabled:pointer-events-none";
  const sizes = size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm";
  const variants =
    variant === "primary"
      ? "btn-primary text-white hover:opacity-95"
      : variant === "danger"
        ? "bg-rose-500 text-white hover:bg-rose-400"
        : variant === "ghost"
          ? "bg-transparent hover:bg-white/5 text-zinc-100"
          : "bg-white/10 hover:bg-white/15 text-zinc-100 ring-1 ring-inset ring-white/10";

  return (
    <button className={cn(base, sizes, variants, className)} {...props} />
  );
}

