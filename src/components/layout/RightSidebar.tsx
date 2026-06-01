"use client";

import { useState } from "react";
import type { TutorResponse } from "@/types/tutor";
import type { NotebookEntry } from "@/types/notebook";
import type { CozeAgentPackage } from "@/types/agentPackage";
import type { ResourceItem } from "@/types/tutor";
import { coerceLearnerState, coerceTutorMode } from "@/lib/cozePackageAdapter";
import LearningStateBadge from "@/components/panels/LearningStateBadge";
import ModeBadge from "@/components/panels/ModeBadge";
import RecommendedResourcesPanel from "@/components/panels/RecommendedResourcesPanel";
import LearningNotebookPanel from "@/components/notebook/LearningNotebookPanel";

function weakTopicFromCoze(pkg: CozeAgentPackage): string {
  const w = pkg.weakTopic;
  if (w == null || w === "") return "";
  if (typeof w === "string") return w.trim();
  return (w.label ?? w.id ?? "").toString().trim();
}

function resourcesFromCoze(pkg: CozeAgentPackage): ResourceItem[] {
  return pkg.resources.map((r) => {
    const url = (r.url ?? "").trim();
    const isVideo = /youtube|youtu\.be|bilibili|vimeo/i.test(url);
    return {
      type: isVideo ? "video" : "article",
      title: r.title,
      source: r.channel || undefined,
      reason: r.description || undefined,
      url: url || undefined,
    };
  });
}

interface RightSidebarProps {
  response: TutorResponse;
  cozePackage?: CozeAgentPackage | null;
  notebookEntries?: NotebookEntry[];
  onUpdateNotebookEntry?: (id: string, content: string, title?: string) => void;
  onRemoveNotebookEntry?: (id: string) => void;
  onGenerateSummaryNote?: () => void;
  onCreateNote?: () => void;
  onOpenWorkbench?: () => void;
}

type StudioItem = "weak" | "next" | "notebook" | "summary" | "resources";

const studioHelpText: Record<StudioItem, string> = {
  weak: "Shows the most critical weak concept to repair now.",
  next: "Suggests the next best learning action to keep momentum.",
  notebook: "Manage notes, create entries, and export study artifacts.",
  summary: "Review what has been covered in the current session.",
  resources: "See recommended materials for follow-up learning.",
};

export default function RightSidebar({
  response,
  cozePackage,
  notebookEntries = [],
  onUpdateNotebookEntry,
  onRemoveNotebookEntry,
  onGenerateSummaryNote,
  onCreateNote,
  onOpenWorkbench,
}: RightSidebarProps) {
  const summary = response.sessionSummary;
  const weakCoze = cozePackage ? weakTopicFromCoze(cozePackage) : "";
  const weakTopic = weakCoze ? { id: "coze-weak", label: weakCoze } : response.weakTopic;
  const next =
    cozePackage?.nextRecommendation?.trim()
      ? {
          id: "coze-next",
          title: cozePackage.nextRecommendation.trim(),
          detail: undefined as string | undefined,
        }
      : (response.nextRecommendation ?? summary?.recommendation ?? null);
  const cozeSummaryText = cozePackage?.sessionSummary?.trim() ?? "";
  const resourceList: ResourceItem[] =
    cozePackage && cozePackage.resources.length > 0
      ? resourcesFromCoze(cozePackage)
      : (response.recommendedResources ?? []);

  const [openDrawer, setOpenDrawer] = useState<Exclude<StudioItem, "weak" | "next" | "notebook"> | null>(null);

  const brainMode = cozePackage ? coerceTutorMode(cozePackage.mode) : response.mode;
  const brainState = cozePackage
    ? coerceLearnerState(cozePackage.learningState)
    : response.learningState;
  const brainStateLabel = cozePackage?.learningState?.trim() || undefined;

  return (
    <aside className="order-3 flex min-h-0 flex-col gap-4 overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900/82 p-4 text-[13px] leading-snug shadow-[0_6px_24px_rgba(0,0,0,0.35)] md:text-sm lg:p-5">
      <section className="studio-card p-3.5">
        <div className="text-base font-semibold uppercase tracking-wider text-white">
          Tutor Brain
        </div>
        <div className="mt-2 h-px w-full bg-white/15" />
        <p className="mt-2 text-xs text-white/70">
          Real-time tutor state based on the learner response.
        </p>

        <div className="mt-3 rounded-lg bg-black/20 p-3 ring-1 ring-white/15">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-white/90">Mode</span>
            <ModeBadge mode={brainMode} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-white/90">Learner state</span>
            <LearningStateBadge state={brainState} customLabel={brainStateLabel} />
          </div>
        </div>
      </section>

      <section className="studio-card p-3.5">
        <div className="text-base font-semibold uppercase tracking-wider text-white">
          Study Studio
        </div>
        <div className="mt-2 h-px w-full bg-white/15" />

        <section
          className="group relative mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 ring-1 ring-white/10"
        >
          <div className="pointer-events-none absolute left-2 top-0 z-20 hidden max-w-[280px] -translate-y-[115%] rounded-lg border border-white/20 bg-white px-3 py-2 text-[12px] text-neutral-900 shadow-lg group-hover:block">
            {studioHelpText.weak}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
            Weak topic
          </div>
          {weakTopic ? (
            <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-sm text-amber-100">
              {weakTopic.label}
            </div>
          ) : (
            <p className="mt-2 text-xs text-white/80">No weak topic flagged this turn.</p>
          )}
        </section>

        <section
          className="group relative mt-3 rounded-lg border border-rose-300/20 bg-rose-300/10 p-3 ring-1 ring-white/10"
        >
          <div className="pointer-events-none absolute left-2 top-0 z-20 hidden max-w-[280px] -translate-y-[115%] rounded-lg border border-white/20 bg-white px-3 py-2 text-[12px] text-neutral-900 shadow-lg group-hover:block">
            {studioHelpText.next}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
            Next recommendation
          </div>
          {next ? (
            <div className="mt-2 space-y-1 text-sm text-white">
              <div className="font-medium">{next.title}</div>
              {next.detail && <p className="text-xs text-white/90">{next.detail}</p>}
            </div>
          ) : (
            <p className="mt-2 text-xs text-white/80">Next step will appear after more turns.</p>
          )}
        </section>

        <section
          className="group relative mt-3 rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-3 ring-1 ring-white/10"
        >
          <div className="pointer-events-none absolute left-2 top-0 z-20 hidden max-w-[280px] -translate-y-[115%] rounded-lg border border-white/20 bg-white px-3 py-2 text-[12px] text-neutral-900 shadow-lg group-hover:block">
            {studioHelpText.notebook}
          </div>
          {onUpdateNotebookEntry && onGenerateSummaryNote && (
            <LearningNotebookPanel
              entries={notebookEntries}
              onUpdateEntry={onUpdateNotebookEntry}
              onRemoveEntry={onRemoveNotebookEntry}
              onGenerateSummary={onGenerateSummaryNote}
              onCreateNote={onCreateNote}
              onOpenWorkbench={onOpenWorkbench}
            />
          )}
        </section>

        <section
          className="group relative mt-3 rounded-lg border border-violet-300/20 bg-violet-300/10 p-3 ring-1 ring-white/10"
        >
          <div className="pointer-events-none absolute left-2 top-0 z-20 hidden max-w-[280px] -translate-y-[115%] rounded-lg border border-white/20 bg-white px-3 py-2 text-[12px] text-neutral-900 shadow-lg group-hover:block">
            {studioHelpText.summary}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
            Session summary
          </div>
          {cozeSummaryText ? (
            <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-white/90">{cozeSummaryText}</p>
          ) : summary ? (
            <ul className="mt-2 space-y-1 text-sm text-white/90">
              {summary.coveredTopics.slice(0, 3).map((t) => (
                <li key={t} className="truncate">{t}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-white/80">Summary will appear as the session progresses.</p>
          )}
          {(cozeSummaryText || summary) && (
            <button
              type="button"
              onClick={() => setOpenDrawer("summary")}
              className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-left text-xs text-white/70 hover:bg-white/10"
            >
              View full details
            </button>
          )}
        </section>

        <section
          className="group relative mt-3 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3 ring-1 ring-white/10"
        >
          <div className="pointer-events-none absolute left-2 top-0 z-20 hidden max-w-[280px] -translate-y-[115%] rounded-lg border border-white/20 bg-white px-3 py-2 text-[12px] text-neutral-900 shadow-lg group-hover:block">
            {studioHelpText.resources}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
            Recommended resources
          </div>
          {resourceList.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {resourceList.slice(0, 3).map((r, i) => (
                <li key={`${r.title}-${i}`} className="text-sm">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-cyan-200 underline decoration-white/20 hover:decoration-cyan-200/60">
                      {r.title}
                    </a>
                  ) : (
                    <span className="text-white/90">{r.title}</span>
                  )}
                  {r.source && <span className="ml-1 text-xs text-white/50">({r.source})</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-white/80">Resources will appear when the tutor identifies useful materials.</p>
          )}
          {resourceList.length > 3 && (
            <button
              type="button"
              onClick={() => setOpenDrawer("resources")}
              className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-left text-xs text-white/70 hover:bg-white/10"
            >
              View all {resourceList.length} resources
            </button>
          )}
        </section>
      </section>

      {openDrawer && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpenDrawer(null)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-[460px] overflow-y-auto border-l border-white/15 bg-neutral-900 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                {openDrawer === "summary"
                    ? "Session Summary"
                    : "Recommended Resources"}
              </h3>
              <button
                type="button"
                onClick={() => setOpenDrawer(null)}
                className="rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>

            {openDrawer === "summary" && (
              <section className="rounded-lg border border-white/10 bg-white/5 p-3">
                {cozeSummaryText ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">{cozeSummaryText}</p>
                ) : summary ? (
                  <div className="space-y-3 text-sm text-white/90">
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/80">
                        Covered topics
                      </div>
                      <ul className="space-y-1">
                        {summary.coveredTopics.map((t) => (
                          <li key={t} className="text-white/90">{t}</li>
                        ))}
                      </ul>
                    </div>
                    {summary.weakPoints.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/80">
                          Weak points
                        </div>
                        <ul className="space-y-1">
                          {summary.weakPoints.map((t) => (
                            <li key={t} className="text-white/90">{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-white/80">Summary will appear as the session progresses.</p>
                )}
              </section>
            )}

            {openDrawer === "resources" && (
              <>
                {resourceList.length > 0 ? (
                  <RecommendedResourcesPanel resources={resourceList} />
                ) : (
                  <section className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-sm text-white/75">
                      Resource cards will appear here when the tutor identifies useful videos or readings.
                    </p>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
