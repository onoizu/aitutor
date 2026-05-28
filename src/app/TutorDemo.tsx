"use client";

import * as React from "react";
import { mockSession } from "@/lib/mockSession";
import type {
  ChatMessage,
  LearnerState,
  TutorCardModel,
  TutorMode,
} from "@/lib/types";
import { TUTOR_MODES } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LearnerStatePill, ModePill } from "@/components/ModeStatePills";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function modeLabel(mode: TutorMode) {
  return TUTOR_MODES.find((m) => m.id === mode)?.label ?? mode;
}

function cardAccent(kind: TutorCardModel["kind"]) {
  switch (kind) {
    case "explanation":
      return "ring-sky-400/25";
    case "quiz":
      return "ring-violet-400/25";
    case "repair":
      return "ring-amber-400/25";
    case "summary":
      return "ring-emerald-400/25";
  }
}

export default function TutorDemo() {
  const [topic, setTopic] = React.useState(mockSession.topic);
  const [mode, setMode] = React.useState<TutorMode>(mockSession.mode);
  const [learnerState, setLearnerState] = React.useState<LearnerState>(
    mockSession.learnerState,
  );
  const [weakTopics, setWeakTopics] = React.useState<string[]>(
    mockSession.weakTopics,
  );
  const [nextRec, setNextRec] = React.useState(mockSession.nextRecommendation);
  const [messages, setMessages] = React.useState<ChatMessage[]>(
    mockSession.messages,
  );
  const [cards] = React.useState<TutorCardModel[]>(mockSession.cards);

  const quizCard = cards.find((c) => c.kind === "quiz");
  const repairCard = cards.find((c) => c.kind === "repair");
  const summaryCard = cards.find((c) => c.kind === "summary");

  const [composer, setComposer] = React.useState("");
  const [activeCard, setActiveCard] = React.useState<TutorCardModel["kind"]>(
    "explanation",
  );

  const [selectedChoiceId, setSelectedChoiceId] = React.useState<string | null>(
    null,
  );
  const [quizSubmitted, setQuizSubmitted] = React.useState(false);

  React.useEffect(() => {
    setActiveCard(
      mode === "teach"
        ? "explanation"
        : mode === "quiz"
          ? "quiz"
          : mode === "repair"
            ? "repair"
            : "summary",
    );
  }, [mode]);

  function pushTutorMessage(content: string) {
    setMessages((m) => [
      ...m,
      {
        id: uid("tutor"),
        role: "tutor",
        content,
        createdAtIso: new Date().toISOString(),
      },
    ]);
  }

  function sendStudentMessage() {
    const text = composer.trim();
    if (!text) return;

    setMessages((m) => [
      ...m,
      {
        id: uid("student"),
        role: "student",
        content: text,
        createdAtIso: new Date().toISOString(),
      },
    ]);
    setComposer("");

    // Simple mock “adaptive” behavior for demo.
    if (mode === "teach") {
      setLearnerState("ready_for_quiz");
      setNextRec("Switch to Quiz Mode for a quick check.");
      pushTutorMessage(
        "Got it. If you can explain the BST invariant in one sentence, you’re ready for a quick quiz.",
      );
    } else if (mode === "quiz") {
      pushTutorMessage(
        "Answer the question in the Quiz card. If you miss it, we’ll switch to Repair Mode with targeted hints.",
      );
    } else if (mode === "repair") {
      setLearnerState("wrong_but_fixable");
      pushTutorMessage(
        "Let’s fix it step-by-step. Focus on the definition of height h and relate runtime to levels visited.",
      );
    } else {
      pushTutorMessage(
        "Review Mode: I’ll summarize what you learned and recommend the next micro-task.",
      );
    }
  }

  function resetQuiz() {
    setSelectedChoiceId(null);
    setQuizSubmitted(false);
  }

  function submitQuiz() {
    if (!quizCard || quizCard.kind !== "quiz") return;
    if (!selectedChoiceId) return;
    setQuizSubmitted(true);

    if (selectedChoiceId === quizCard.correctChoiceId) {
      setLearnerState("ready_for_quiz");
      setNextRec("Great—switch to Review Mode for a session summary.");
      pushTutorMessage("Nice. You tied the runtime to height h correctly.");
    } else {
      setLearnerState("wrong_but_fixable");
      setWeakTopics((t) =>
        t.includes("height vs n") ? t : ["height vs n", ...t].slice(0, 5),
      );
      setNextRec("Switch to Repair Mode to correct the misconception.");
      pushTutorMessage(
        "Close. Let’s repair that: the tree isn’t always balanced, so we must use O(h).",
      );
    }
  }

  function switchMode(m: TutorMode) {
    setMode(m);
    if (m === "quiz") resetQuiz();
    if (m === "teach") setLearnerState("needs_example");
    if (m === "review") setLearnerState("ready_for_quiz");
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(56,189,248,0.15),transparent_50%),radial-gradient(900px_circle_at_80%_20%,rgba(167,139,250,0.16),transparent_55%),radial-gradient(900px_circle_at_60%_90%,rgba(52,211,153,0.10),transparent_45%)] bg-zinc-950 text-zinc-100">
      <div className="mx-auto grid min-h-dvh w-full max-w-[1400px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)_340px] lg:gap-4 lg:p-6">
        {/* Left */}
        <aside className="order-2 lg:order-1">
          <Card className="sticky top-6">
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500/15 ring-1 ring-inset ring-sky-400/20">
                    <span className="text-sm font-semibold text-sky-200">
                      AI
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      Adaptive AI Tutor Agent
                    </div>
                    <div className="truncate text-xs text-zinc-300/90">
                      Demo-ready university frontend
                    </div>
                  </div>
                </div>
              }
            />
            <CardBody>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium text-zinc-300">
                    Current topic
                  </div>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="mt-2 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-zinc-100 ring-1 ring-inset ring-white/10 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                    placeholder="e.g. Dijkstra’s algorithm"
                  />
                </div>

                <div>
                  <div className="text-xs font-medium text-zinc-300">
                    Quick navigation
                  </div>
                  <div className="mt-2 grid gap-2">
                    {(
                      [
                        ["Explanation", "explanation"],
                        ["Quiz", "quiz"],
                        ["Repair", "repair"],
                        ["Summary", "summary"],
                      ] as const
                    ).map(([label, kind]) => (
                      <button
                        key={kind}
                        onClick={() => setActiveCard(kind)}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm ring-1 ring-inset transition-colors",
                          activeCard === kind
                            ? "bg-white/10 ring-white/20"
                            : "bg-transparent ring-white/10 hover:bg-white/5",
                        )}
                      >
                        <span className="text-zinc-100">{label}</span>
                        <span className="text-xs text-zinc-400">↵</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-zinc-300">
                    Tutor mode switching
                  </div>
                  <div className="mt-2 grid gap-2">
                    {TUTOR_MODES.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => switchMode(m.id)}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm ring-1 ring-inset transition-colors",
                          mode === m.id
                            ? "bg-white/10 ring-white/20"
                            : "bg-transparent ring-white/10 hover:bg-white/5",
                        )}
                      >
                        <span>{m.label}</span>
                        {mode === m.id ? (
                          <Badge variant="green">Active</Badge>
                        ) : (
                          <span className="text-xs text-zinc-500">Switch</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </aside>

        {/* Center */}
        <main className="order-1 lg:order-2">
          <div className="space-y-4">
            <Card>
              <CardHeader
                title={
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">Session</span>
                    <ModePill mode={mode} />
                    <LearnerStatePill state={learnerState} />
                  </div>
                }
                subtitle={
                  <span>
                    Topic: <span className="text-zinc-100">{topic}</span> ·{" "}
                    Next: <span className="text-zinc-100">{nextRec}</span>
                  </span>
                }
                right={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMode(mockSession.mode);
                      setLearnerState(mockSession.learnerState);
                      setWeakTopics(mockSession.weakTopics);
                      setNextRec(mockSession.nextRecommendation);
                      setMessages(mockSession.messages);
                      setTopic(mockSession.topic);
                      resetQuiz();
                    }}
                  >
                    Reset demo
                  </Button>
                }
              />
              <CardBody>
                <div className="space-y-3">
                  <div className="max-h-[34vh] space-y-2 overflow-auto pr-2">
                    {messages.map((m) => {
                      const isStudent = m.role === "student";
                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "flex items-end gap-2",
                            isStudent ? "justify-end" : "justify-start",
                          )}
                        >
                          {!isStudent ? (
                            <div className="grid h-7 w-7 place-items-center rounded-full bg-white/10 ring-1 ring-inset ring-white/10 text-xs text-zinc-200">
                              T
                            </div>
                          ) : null}
                          <div
                            className={cn(
                              "max-w-[78%] rounded-2xl px-3 py-2 text-sm ring-1 ring-inset",
                              isStudent
                                ? "bg-sky-500/15 text-zinc-100 ring-sky-400/20"
                                : "bg-white/5 text-zinc-100 ring-white/10",
                            )}
                          >
                            <div className="whitespace-pre-wrap leading-relaxed">
                              {m.content}
                            </div>
                            <div className="mt-1 text-[11px] text-zinc-400">
                              {isStudent ? "You" : "Tutor"} ·{" "}
                              {formatTime(m.createdAtIso)}
                            </div>
                          </div>
                          {isStudent ? (
                            <div className="grid h-7 w-7 place-items-center rounded-full bg-sky-500/15 ring-1 ring-inset ring-sky-400/20 text-xs text-sky-200">
                              S
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendStudentMessage();
                        }
                      }}
                      placeholder={`Ask in ${modeLabel(mode)}…`}
                      className="h-10 w-full rounded-xl bg-white/5 px-3 text-sm text-zinc-100 ring-1 ring-inset ring-white/10 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                    />
                    <Button
                      variant="primary"
                      onClick={sendStudentMessage}
                      disabled={!composer.trim()}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>

            <div className="grid gap-4">
              {cards.map((card) => {
                const isActive = activeCard === card.kind;
                return (
                  <Card
                    key={card.kind}
                    className={cn(
                      "ring-1 ring-inset transition-colors",
                      isActive ? cn("ring-white/25", cardAccent(card.kind)) : "",
                    )}
                  >
                    <CardHeader
                      title={
                        <div className="flex items-center gap-2">
                          <span className="capitalize">{card.kind}</span>
                          {isActive ? (
                            <Badge variant="green">Focused</Badge>
                          ) : (
                            <Badge>Card</Badge>
                          )}
                        </div>
                      }
                      subtitle={card.title}
                      right={
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveCard(card.kind)}
                        >
                          Focus
                        </Button>
                      }
                    />
                    <CardBody>
                      {card.kind === "explanation" ? (
                        <div className="space-y-3">
                          <ul className="space-y-2 text-sm text-zinc-100">
                            {card.bullets.map((b) => (
                              <li key={b} className="flex gap-2">
                                <span className="mt-1 text-sky-300">•</span>
                                <span className="text-zinc-100/95">{b}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="rounded-xl bg-sky-500/10 px-3 py-2 text-sm ring-1 ring-inset ring-sky-400/15">
                            <div className="text-xs font-medium text-sky-200">
                              Key takeaway
                            </div>
                            <div className="mt-1 text-zinc-100/95">
                              {card.keyTakeaway}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {card.kind === "quiz" ? (
                        <div className="space-y-3">
                          <div className="text-sm text-zinc-100/95">
                            {card.question}
                          </div>
                          <div className="grid gap-2">
                            {card.choices.map((c) => {
                              const chosen = selectedChoiceId === c.id;
                              const isCorrect =
                                quizSubmitted && c.id === card.correctChoiceId;
                              const isWrong =
                                quizSubmitted &&
                                chosen &&
                                c.id !== card.correctChoiceId;
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    setSelectedChoiceId(c.id);
                                    setQuizSubmitted(false);
                                  }}
                                  className={cn(
                                    "rounded-xl px-3 py-2 text-left text-sm ring-1 ring-inset transition-colors",
                                    chosen
                                      ? "bg-white/10 ring-white/25"
                                      : "bg-transparent ring-white/10 hover:bg-white/5",
                                    isCorrect
                                      ? "ring-emerald-400/35 bg-emerald-500/10"
                                      : "",
                                    isWrong
                                      ? "ring-rose-400/35 bg-rose-500/10"
                                      : "",
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-zinc-100">
                                      {c.label}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                      {c.id.toUpperCase()}
                                    </div>
                                  </div>
                                  {quizSubmitted && chosen ? (
                                    <div className="mt-1 text-xs text-zinc-300/90">
                                      {c.explanation}
                                    </div>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="primary"
                              onClick={submitQuiz}
                              disabled={!selectedChoiceId}
                            >
                              Submit answer
                            </Button>
                            <Button variant="secondary" onClick={resetQuiz}>
                              Reset
                            </Button>
                            {quizSubmitted && quizCard?.kind === "quiz" ? (
                              <Badge
                                variant={
                                  selectedChoiceId === quizCard.correctChoiceId
                                    ? "green"
                                    : "amber"
                                }
                              >
                                {selectedChoiceId === quizCard.correctChoiceId
                                  ? "Correct"
                                  : "Needs repair"}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {card.kind === "repair" ? (
                        <div className="space-y-3">
                          <div className="rounded-xl bg-amber-500/10 px-3 py-2 ring-1 ring-inset ring-amber-400/15">
                            <div className="text-xs font-medium text-amber-200">
                              Common misconception
                            </div>
                            <div className="mt-1 text-sm text-zinc-100/95">
                              {card.misconception}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-zinc-300">
                              Hint steps
                            </div>
                            <ol className="mt-2 space-y-2 text-sm text-zinc-100/95">
                              {card.hintSteps.map((h, idx) => (
                                <li key={h} className="flex gap-2">
                                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/10 text-xs text-zinc-200 ring-1 ring-inset ring-white/10">
                                    {idx + 1}
                                  </span>
                                  <span>{h}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                          <div className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-inset ring-white/10">
                            <div className="text-xs font-medium text-zinc-300">
                              Repaired answer
                            </div>
                            <div className="mt-1 text-sm text-zinc-100/95">
                              {card.fixedAnswer}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="primary"
                              onClick={() => {
                                setMode("review");
                                setLearnerState("ready_for_quiz");
                                setNextRec(
                                  "Review your summary, then try a 2-question quiz.",
                                );
                                pushTutorMessage(
                                  "Great—now that we repaired the reasoning, let’s lock it in with a short review.",
                                );
                              }}
                            >
                              Apply fix → Review
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setMode("quiz");
                                resetQuiz();
                                pushTutorMessage(
                                  "Back to Quiz Mode—try answering again with O(h) in mind.",
                                );
                              }}
                            >
                              Retry quiz
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {card.kind === "summary" ? (
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs font-medium text-zinc-300">
                              What you learned
                            </div>
                            <ul className="mt-2 space-y-2 text-sm text-zinc-100/95">
                              {card.whatYouLearned.map((w) => (
                                <li key={w} className="flex gap-2">
                                  <span className="mt-1 text-emerald-300">
                                    •
                                  </span>
                                  <span>{w}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-inset ring-white/10">
                              <div className="text-xs font-medium text-zinc-300">
                                Weak topics (diagnosis)
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(summaryCard?.kind === "summary"
                                  ? summaryCard.weakTopics
                                  : weakTopics
                                ).map((t) => (
                                  <Badge key={t} variant="amber">
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-xl bg-emerald-500/10 px-3 py-2 ring-1 ring-inset ring-emerald-400/15">
                              <div className="text-xs font-medium text-emerald-200">
                                Next recommendation
                              </div>
                              <div className="mt-1 text-sm text-zinc-100/95">
                                {card.nextRecommendation}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="primary"
                              onClick={() => {
                                setMode("quiz");
                                resetQuiz();
                                pushTutorMessage(
                                  "Quiz Mode: let’s check retention with one more question.",
                                );
                              }}
                            >
                              Continue → Quiz
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setMode("teach");
                                setLearnerState("needs_example");
                                pushTutorMessage(
                                  "Teach Mode: want another concrete example or an insert trace?",
                                );
                              }}
                            >
                              Back to Teach
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </div>
        </main>

        {/* Right */}
        <aside className="order-3">
          <Card className="sticky top-6">
            <CardHeader
              title="Learner diagnostics"
              subtitle="What the tutor infers this turn"
              right={<Badge variant="blue">Mock</Badge>}
            />
            <CardBody>
              <div className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-medium text-zinc-300">
                      Current mode
                    </div>
                    <ModePill mode={mode} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-medium text-zinc-300">
                      Learner state
                    </div>
                    <LearnerStatePill state={learnerState} />
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-inset ring-white/10">
                  <div className="text-xs font-medium text-zinc-300">
                    Weak topics
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {weakTopics.map((t) => (
                      <Badge key={t} variant="amber">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-emerald-500/10 p-3 ring-1 ring-inset ring-emerald-400/15">
                  <div className="text-xs font-medium text-emerald-200">
                    Next recommendation
                  </div>
                  <div className="mt-1 text-sm text-zinc-100/95">{nextRec}</div>
                </div>

                <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-inset ring-white/10">
                  <div className="text-xs font-medium text-zinc-300">
                    Session summary (live)
                  </div>
                  <div className="mt-2 space-y-2 text-sm text-zinc-100/95">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">Messages</span>
                      <span className="font-medium text-zinc-100">
                        {messages.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">Focused card</span>
                      <span className="font-medium text-zinc-100 capitalize">
                        {activeCard}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">Quiz status</span>
                      <span className="font-medium text-zinc-100">
                        {quizCard?.kind === "quiz" && quizSubmitted
                          ? selectedChoiceId === quizCard.correctChoiceId
                            ? "Correct"
                            : "Incorrect"
                          : "Not submitted"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setMode("teach");
                      setActiveCard("explanation");
                      pushTutorMessage(
                        "Teach Mode: I can re-explain with a different example if you want.",
                      );
                    }}
                  >
                    Teach
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setMode("quiz");
                      setActiveCard("quiz");
                      resetQuiz();
                      pushTutorMessage(
                        "Quiz Mode: answer the question card when ready.",
                      );
                    }}
                  >
                    Quiz
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setMode("repair");
                      setActiveCard("repair");
                      pushTutorMessage(
                        "Repair Mode: we’ll fix misconceptions with targeted hints.",
                      );
                    }}
                  >
                    Repair
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setMode("review");
                      setActiveCard("summary");
                      pushTutorMessage(
                        "Review Mode: summarizing learning + next steps.",
                      );
                    }}
                  >
                    Review
                  </Button>
                </div>

                {repairCard?.kind === "repair" && learnerState === "frustrated" ? (
                  <div className="rounded-2xl bg-rose-500/10 p-3 ring-1 ring-inset ring-rose-400/15">
                    <div className="text-xs font-medium text-rose-200">
                      De-escalation
                    </div>
                    <div className="mt-1 text-sm text-zinc-100/95">
                      Let’s slow down: we’ll do one hint step at a time, no
                      penalty. You’re making progress.
                    </div>
                  </div>
                ) : null}
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}

