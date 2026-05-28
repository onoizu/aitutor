"use client";

import type { Recommendation } from "@/types/tutor";

interface RecommendationPanelProps {
  recommendation: Recommendation | null;
  title?: string;
}

export default function RecommendationPanel({
  recommendation,
  title = "Next recommendation",
}: RecommendationPanelProps) {
  return (
    <section className="rounded-xl bg-slate-900/80 p-3 ring-1 ring-inset ring-slate-800">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </div>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-100 ring-1 ring-emerald-400/40">
          Adaptive
        </span>
      </div>
      {recommendation ? (
        <div className="mt-1 space-y-1 text-xs text-slate-200">
          <div className="font-medium">{recommendation.title}</div>
          {recommendation.detail && (
            <p className="text-[11px] text-slate-400">{recommendation.detail}</p>
          )}
        </div>
      ) : (
        <p className="mt-1 text-xs text-slate-500">
          Once the tutor has enough signal about your understanding, a tailored
          next step will appear here.
        </p>
      )}
    </section>
  );
}

