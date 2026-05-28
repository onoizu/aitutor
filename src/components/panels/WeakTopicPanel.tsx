"use client";

import type { WeakTopic } from "@/types/tutor";

interface WeakTopicPanelProps {
  topics: WeakTopic[];
  title?: string;
}

export default function WeakTopicPanel({
  topics,
  title = "Weak topics",
}: WeakTopicPanelProps) {
  return (
    <section className="rounded-xl bg-slate-900/80 p-3 ring-1 ring-inset ring-slate-800">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </div>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-100 ring-1 ring-amber-400/40">
          Diagnosis
        </span>
      </div>
      {topics.length === 0 ? (
        <p className="mt-1 text-xs text-slate-500">
          The tutor has not flagged any weak topics yet for this session.
        </p>
      ) : (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {topics.map((t) => (
            <li
              key={t.id}
              className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-100 ring-1 ring-amber-400/50"
            >
              {t.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

