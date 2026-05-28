"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-white/5 ring-1 ring-inset ring-white/10 backdrop-blur",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 px-4 pt-4">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-zinc-100">{title}</h3>
        {subtitle ? (
          <p className="mt-1 text-xs text-zinc-300/90">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}

export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="px-4 pb-4 pt-3">{children}</div>;
}

