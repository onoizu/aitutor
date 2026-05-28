"use client";

export function Divider({ className }: { className?: string }) {
  return <div className={className ?? "h-px w-full bg-white/10"} />;
}

