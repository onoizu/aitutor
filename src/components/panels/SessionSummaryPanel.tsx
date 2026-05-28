"use client";

import type { SessionSummary } from "@/types/tutor";

interface SessionSummaryPanelProps {
  summary: SessionSummary | null;
  title?: string;
}

export default function SessionSummaryPanel({
  summary,
  title = "Session summary",
}: SessionSummaryPanelProps) {
  return (
    <section className="rounded-xl bg-slate-900/80 p-3 ring-1 ring-inset ring-slate-800">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </div>
        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-100 ring-1 ring-sky-400/40">
          Overview
        </span>
      </div>

      {!summary ? (
        <p className="mt-1 text-xs text-slate-500">
          A live summary will be generated as the tutor sees more of your work.
        </p>
      ) : (
        <div className="mt-1 space-y-2 text-xs text-slate-200">
          {summary.coveredTopics.length > 0 && (
            <div>
              <div className="mb-1 text-[11px] font-medium text-slate-400">
                Covered topics
              </div>
              <ul className="space-y-0.5">
                {summary.coveredTopics.map((t) => (
                  <li key={t} className="flex gap-1.5">
                    <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-sky-400/80" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.weakPoints.length > 0 && (
            <div>
              <div className="mb-1 text-[11px] font-medium text-slate-400">
                Weak points
              </div>
              <ul className="space-y-0.5">
                {summary.weakPoints.map((t) => (
                  <li key={t} className="flex gap-1.5">
                    <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-amber-400/80" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.recommendation && (
            <div>
              <div className="mb-1 text-[11px] font-medium text-slate-400">
                Suggested next step
              </div>
              <div className="rounded-lg bg-slate-950/80 p-2 ring-1 ring-inset ring-slate-800">
                <div className="text-[11px] font-medium text-slate-100">
                  {summary.recommendation.title}
                </div>
                {summary.recommendation.detail && (
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {summary.recommendation.detail}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

