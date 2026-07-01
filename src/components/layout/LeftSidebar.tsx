"use client";

import { useEffect, useState } from "react";
import AIStatus from "@/components/AIStatus";
import RobotTutorIcon from "@/components/icons/RobotTutorIcon";
import CurrentLearningGoalPanel from "@/components/panels/CurrentLearningGoalPanel";
import type { AgentSessionItem, LearningActionType } from "@/components/layout/MainLayout";

interface LeftSidebarProps {
  topic: string;
  modeLabel: string;
  currentLearningGoals?: string[];
  sessions?: AgentSessionItem[];
  activeSessionId?: string;
  onSwitchSession?: (sessionId: string) => void;
  onCreateSession?: () => void;
  onRenameSession?: (sessionId: string, title: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onLearningAction?: (action: LearningActionType) => void;
}

const quickMenu = [
  { id: "concept_overview", label: "Concept overview", detail: "Definition + key ideas" },
  { id: "guided_examples", label: "Guided examples", detail: "Step-by-step example" },
  { id: "quiz_check", label: "Quiz check", detail: "Generate one quiz question" },
  { id: "mind_map", label: "Mind map", detail: "Visual concept map of the topic" },
  { id: "answer_repair", label: "Answer repair", detail: "Fix recent misconception" },
  { id: "feynman_reflection", label: "Feynman reflection", detail: "Explain it in your own words" },
  { id: "study_plan_checkin", label: "Study plan", detail: "Review plan and next steps" },
  { id: "session_review", label: "Session review", detail: "Generate summary note" },
] as const;

function AITutorMark() {
  return (
    <div
      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-500/40 via-violet-500/32 to-fuchsia-500/26 shadow-[0_8px_28px_-6px_rgba(34,211,238,0.35)] ring-2 ring-white/20"
      aria-hidden
    >
      <RobotTutorIcon className="h-7 w-7 text-white drop-shadow-sm" />
    </div>
  );
}

export default function LeftSidebar({
  topic: _topic,
  modeLabel,
  currentLearningGoals,
  sessions = [],
  activeSessionId,
  onSwitchSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
  onLearningAction,
}: LeftSidebarProps) {
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!menuSessionId) return;
    const close = () => setMenuSessionId(null);
    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
    };
  }, [menuSessionId]);

  return (
    <aside className="order-2 flex min-h-0 flex-col gap-4 overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900/85 p-4 shadow-[0_6px_24px_rgba(0,0,0,0.35)] lg:order-1 lg:gap-5 lg:p-5">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <AITutorMark />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-[1.65rem]">
            AI Tutor
          </h1>
          <AIStatus />
        </div>
      </div>

      {/* Sessions list */}
      <section className="studio-card p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/90">
            Conversations
          </div>
          {onCreateSession && (
            <button
              type="button"
              onClick={onCreateSession}
              className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-white/90 hover:bg-white/10"
            >
              New Session
            </button>
          )}
        </div>
        {sessions.length > 0 ? (
          <ul className="space-y-1.5">
            {sessions.map((session) => (
              <li key={session.id} className="relative">
                <div
                  onClick={() => onSwitchSession?.(session.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuSessionId(session.id);
                  }}
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                    activeSessionId === session.id
                      ? "bg-white/18 text-white ring-1 ring-white/35 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                      : "bg-white/5 text-white/90 hover:bg-white/10"
                  }`}
                >
                  <input
                    value={session.title}
                    onChange={(e) => onRenameSession?.(session.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={() => onSwitchSession?.(session.id)}
                    onBlur={(e) => {
                      if (!e.currentTarget.value.trim()) {
                        onRenameSession?.(session.id, "Untitled Session");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    aria-label={`Rename session ${session.title}`}
                    className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 font-medium text-white outline-none transition-colors hover:border-white/10 hover:bg-black/10 focus:border-cyan-200/40 focus:bg-black/20 focus:ring-1 focus:ring-cyan-200/20"
                  />
                  <div className="mt-0.5 text-[11px] text-white/60">
                    {new Date(session.updatedAt).toLocaleString()}
                  </div>
                </div>
                {menuSessionId === session.id && onDeleteSession && (
                  <div
                    className="absolute right-2 top-2 z-40 min-w-[120px] rounded-lg border border-red-300/20 bg-neutral-950 py-1 shadow-2xl ring-1 ring-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteSession(session.id);
                        setMenuSessionId(null);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-red-200 transition-colors hover:bg-red-500/15 hover:text-red-100"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/60">No sessions yet. Create one to start chatting.</p>
        )}
      </section>

      {currentLearningGoals && currentLearningGoals.length > 0 && (
        <CurrentLearningGoalPanel goals={currentLearningGoals} />
      )}

      {/* Left-bottom quick menu */}
      <nav className="mt-auto studio-card p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-white/90">
          Learning Actions
        </div>
        <ul className="mt-2 space-y-1">
          {quickMenu.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onLearningAction?.(item.id)}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/10"
              >
                <span>
                  <span className="block text-sm text-white">{item.label}</span>
                  <span className="block text-[11px] text-white/60">{item.detail}</span>
                </span>
                <span className="text-xs text-white/60">↵</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] text-white/70">
          Active mode: {modeLabel}
        </div>
      </nav>
    </aside>
  );
}
