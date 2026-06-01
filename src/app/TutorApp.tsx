"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MainLayout, {
  type AgentSessionItem,
  type LearningActionType,
  type LiveTurn,
} from "@/components/layout/MainLayout";
import { sendMessage } from "@/lib/api";
import {
  cozePackageToTutorResponse,
  coerceTutorMode,
  inferCozePackageFromTutorResponse,
} from "@/lib/cozePackageAdapter";
import { mergeStickyCozeFields } from "@/lib/mergeStickyCozePackage";
import { EMPTY_COZE_PACKAGE } from "@/lib/normalizeAgentPackage";
import { generateSessionSummaryNote } from "@/lib/notebookUtils";
import type { NotebookEntry } from "@/types/notebook";
import type { CozeAgentPackage } from "@/types/agentPackage";
import type { QuizSession, RepairResult, TutorResponse } from "@/types/tutor";

/** Shown as the tutor’s first message in every new session. */
const SESSION_WELCOME_MARKDOWN = `👋 Hi there! I'm your AI Tutor for Computer Science & AI Learning.

I can help you with:

- **📚 Concept Explanation:** Clear, example-driven explanations of CS/AI concepts
- **💻 Code Co-Pilot:** Debugging, syntax help, and coding guidance
- **📝 Note-Taking:** Auto-summarize key points from your learning
- **🧩 Practice Quizzes:** Generate custom single-choice questions to test your understanding
- **🔍 Resource Recommendations:** Curated videos, courses, and research papers
- **📊 Learning Summary:** Recap your progress and identify weak points
- **🎯 Error Analysis:** Fix mistakes and clarify misunderstandings

Just tell me what you want to learn, ask a question, or request a quiz, and I'll guide you step by step!`;

function createWelcomeTurn(): LiveTurn {
  const response: TutorResponse = {
    intent: "explain_concept",
    learningState: "needs_example",
    mode: "teach",
    content: {
      contentType: "explanation",
      definition: SESSION_WELCOME_MARKDOWN,
      intuition: "",
      example: "",
      commonMistake: "",
    },
    message:
      "👋 Hi there! I'm your AI Tutor for AI Learning.",
    weakTopic: null,
    nextRecommendation: null,
    sessionSummary: null,
  };
  return {
    id: `welcome_${uid()}`,
    role: "tutor",
    text: SESSION_WELCOME_MARKDOWN,
    response,
    plainMessage: true,
  };
}

function uid() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function deriveQuizSession(r: TutorResponse): QuizSession | null {
  if (r.quizSession?.questions?.length) return r.quizSession;
  if (r.mode === "quiz" && r.content.contentType === "quiz") {
    return { questions: [r.content], currentIndex: 0 };
  }
  return null;
}

const QUIZ_TRIGGER =
  /\b(quiz|测验|测试|出题|做题|小测|练习|来道题|考考我|quick\s*check)\b/i;

interface SessionData {
  id: string;
  title: string;
  titleCustomized?: boolean;
  updatedAt: string;
  liveTurns: LiveTurn[];
  response: TutorResponse;
  cozePackage: CozeAgentPackage;
  conversationId: string;
  notebookEntries: NotebookEntry[];
  quizSession?: QuizSession;
  quizCleared?: boolean;
  cozeQuizDismissed?: boolean;
}

function newSession(): SessionData {
  const pkg = { ...EMPTY_COZE_PACKAGE };
  return {
    id: uid(),
    title: "New Chat",
    updatedAt: new Date().toISOString(),
    liveTurns: [createWelcomeTurn()],
    cozePackage: pkg,
    response: cozePackageToTutorResponse(pkg),
    conversationId: "",
    notebookEntries: [],
  };
}

function displayModeForSession(session: SessionData): "teach" | "quiz" {
  const hasCozeQuiz = Boolean(
    session.cozePackage?.quiz?.question &&
      session.cozePackage.quiz.options?.length &&
      !session.cozeQuizDismissed,
  );
  const hasLegacyQuiz = Boolean(
    !session.quizCleared &&
      session.quizSession?.questions?.length,
  );
  return hasCozeQuiz || hasLegacyQuiz ? "quiz" : "teach";
}

const LEARNING_PROMPTS: Record<LearningActionType, string> = {
  concept_overview:
    "Give me a concept overview of the current topic. " +
    "Include definition, key ideas, intuition, example, and commonMistake in mainResponse. Set mode to \"teach\".",
  guided_examples:
    "Walk me through a step-by-step guided example for the current topic. " +
    "Put the worked example in mainResponse (summary, definition for setup, example for the walkthrough). Set mode to \"teach\".",
  quiz_check:
    "Generate one multiple-choice quiz question about the current topic. " +
    "Fill in the quiz field (question, options, correctAnswer, explanation, hint). Set mode to \"quiz\".",
  answer_repair:
    "I think I have a misconception about what we just discussed. " +
    "Identify my likely weak point and explain it clearly. Fill weakTopic, and put the corrective explanation in mainResponse. Set mode to \"teach\".",
  mind_map:
    "Generate a mind map of the current topic using Mermaid mindmap syntax. " +
    "Put the raw Mermaid code (starting with \"mindmap\\n  root((...\") in a \"mindmap\" field with keys \"mermaidCode\" and \"title\". " +
    "Do NOT use markdown code fences. Set mode to \"mindmap\".",
  session_review:
    "Generate a summary note for this session. " +
    "Fill sessionSummary with covered topics, weakTopic with any weak points, and nextRecommendation with what to study next. Set mode to \"review\".",
};

const LEARNING_DISPLAY: Record<LearningActionType, string> = {
  concept_overview: "📖 Concept overview",
  guided_examples: "🔍 Guided examples",
  quiz_check: "⚡ Quiz check",
  mind_map: "🗺 Mind map",
  answer_repair: "🔧 Answer repair",
  session_review: "✓ Session review",
};

export default function TutorApp() {
  const [sessions, setSessions] = useState<SessionData[]>(() => [newSession()]);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]!.id);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<"teach" | "quiz">("teach");

  const abortRef = useRef<AbortController | null>(null);
  const activeIdRef = useRef(activeSessionId);
  const pendingQuizIntentRef = useRef(false);

  const active = sessions.find((s) => s.id === activeSessionId) ?? sessions[0]!;

  useEffect(() => {
    activeIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const patchSession = useCallback((sessionId: string, patch: Partial<SessionData>) => {
    const now = new Date().toISOString();
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, ...patch, updatedAt: now } : s)),
    );
  }, []);

  const mergeFromApiResult = useCallback((result: import("@/lib/api").SendMessageResult): CozeAgentPackage => {
    return result.cozePackage ?? inferCozePackageFromTutorResponse(result);
  }, []);

  const onSendMessage = useCallback(
    async (text: string, image?: File, document?: File, displayOverride?: string) => {
      const sid = activeIdRef.current;
      const session = sessions.find((s) => s.id === sid) ?? sessions[0];
      if (!session) return;

      const rawDisplay =
        text.trim() ||
        (image ? "Analyze this image" : document ? "Answer based on this document" : "");
      if (!rawDisplay && !image && !document) return;
      const display = displayOverride?.trim() || rawDisplay;

      const wantQuiz = QUIZ_TRIGGER.test(text) || pendingQuizIntentRef.current;
      pendingQuizIntentRef.current = false;
      if (wantQuiz) setDisplayMode("quiz");

      let messageToSend = rawDisplay;
      if (wantQuiz && !messageToSend.includes("[Context:")) {
        const lastSummary = session.cozePackage?.mainResponse?.summary?.trim();
        if (lastSummary) {
          messageToSend =
            `[Context: the current topic is "${session.title}". ` +
            `Last tutor explanation summary: "${lastSummary.slice(0, 500)}"]\n\n` +
            `${rawDisplay}\n\n` +
            `Please generate a quiz question specifically about the topic above. ` +
            `Set mode to "quiz" and fill in the quiz field (question, options, correctAnswer, explanation, hint).`;
        }
      }

      const userTurn: LiveTurn = {
        id: uid(),
        role: "user",
        text: display,
      };
      const isFirstUserMessage = !session.liveTurns.some((t) => t.role === "user");

      patchSession(sid, {
        liveTurns: [...session.liveTurns, userTurn],
        title: isFirstUserMessage && !session.titleCustomized ? (display.slice(0, 40) || "Chat") : session.title,
        ...(wantQuiz
          ? {
              cozePackage: { ...session.cozePackage, quiz: null },
              cozeQuizDismissed: false,
              quizCleared: false,
            }
          : {}),
      });

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const result = await sendMessage(messageToSend, {
          sessionId: sid,
          conversationId: session.conversationId || undefined,
          image,
          document,
          signal: abortRef.current.signal,
        });

        const conv = result._conversationId ?? session.conversationId;
        const rawPkg = mergeFromApiResult(result);
        const quizContentPresent = Boolean(rawPkg.quiz?.question && rawPkg.quiz.options?.length);
        const pkgBase =
          wantQuiz && quizContentPresent ? { ...rawPkg, mode: "quiz" } : rawPkg;
        const pkg = mergeStickyCozeFields(session.cozePackage, pkgBase);
        const response = cozePackageToTutorResponse(pkg);
        const tutorTurn: LiveTurn = {
          id: uid(),
          role: "tutor",
          text: response.message || pkg.mainResponse.summary,
          response,
        };

        const hasQuiz =
          quizContentPresent &&
          (wantQuiz || coerceTutorMode(pkg.mode) === "quiz");

        if (hasQuiz) {
          setDisplayMode("quiz");
        } else {
          setDisplayMode("teach");
        }

        const legacyQuiz = hasQuiz ? deriveQuizSession(response) : null;

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sid) return s;
            const turns = [...s.liveTurns, tutorTurn];
            return {
              ...s,
              liveTurns: turns,
              cozePackage: pkg,
              response,
              conversationId: conv,
              quizSession: hasQuiz ? undefined : legacyQuiz ?? undefined,
              quizCleared: false,
              cozeQuizDismissed: false,
              updatedAt: new Date().toISOString(),
            };
          }),
        );
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        const msg = e instanceof Error ? e.message : "Request failed";
        const errPkg: CozeAgentPackage = {
          ...EMPTY_COZE_PACKAGE,
          mainResponse: { summary: `Request failed: ${msg}` },
        };
        const errRes = cozePackageToTutorResponse(errPkg);
        const fallback: LiveTurn = {
          id: uid(),
          role: "tutor",
          text: errRes.message,
          response: errRes,
        };
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sid
              ? {
                  ...s,
                  cozePackage: errPkg,
                  response: errRes,
                  liveTurns: [...s.liveTurns, fallback],
                  updatedAt: new Date().toISOString(),
                }
              : s,
          ),
        );
        setDisplayMode("teach");
      }
    },
    [sessions, patchSession, mergeFromApiResult],
  );

  const onCancelSend = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const onLearningAction = useCallback(
    async (action: LearningActionType) => {
      if (action === "quiz_check") pendingQuizIntentRef.current = true;

      const session = sessions.find((s) => s.id === activeIdRef.current) ?? sessions[0];
      const topic = session?.title || "the current topic";
      const lastSummary = session?.cozePackage?.mainResponse?.summary?.trim();

      const contextPrefix =
        `[Context: current topic is "${topic}".` +
        (lastSummary ? ` Last explanation: "${lastSummary.slice(0, 600)}"` : "") +
        `]\n\n`;

      const fullPrompt = contextPrefix + LEARNING_PROMPTS[action];
      const displayLabel = LEARNING_DISPLAY[action];

      await onSendMessage(fullPrompt, undefined, undefined, displayLabel);
    },
    [onSendMessage, sessions],
  );

  const onAddNotebookEntry = useCallback(
    (entry: NotebookEntry) => {
      const sid = activeIdRef.current;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sid
            ? {
                ...s,
                notebookEntries: [entry, ...s.notebookEntries],
                updatedAt: new Date().toISOString(),
              }
            : s,
        ),
      );
    },
    [],
  );

  const onUpdateNotebookEntry = useCallback((id: string, content: string, title?: string) => {
    const sid = activeIdRef.current;
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sid) return s;
        return {
          ...s,
          notebookEntries: s.notebookEntries.map((e) =>
            e.id === id
              ? {
                  ...e,
                  content,
                  ...(title !== undefined ? { title } : {}),
                  updatedAt: new Date().toISOString(),
                }
              : e,
          ),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }, []);

  const onRemoveNotebookEntry = useCallback((id: string) => {
    const sid = activeIdRef.current;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sid
          ? {
              ...s,
              notebookEntries: s.notebookEntries.filter((e) => e.id !== id),
              updatedAt: new Date().toISOString(),
            }
          : s,
      ),
    );
  }, []);

  const onGenerateSummaryNote = useCallback(() => {
    const sid = activeIdRef.current;
    const s = sessions.find((x) => x.id === sid) ?? sessions[0];
    if (!s) return;
    const p = s.cozePackage;
    if (p.noteEntry?.title?.trim() && p.noteEntry?.content?.trim()) {
      onAddNotebookEntry({
        id: uid(),
        title: p.noteEntry.title.trim(),
        content: p.noteEntry.content.trim(),
        sourceType: "session_summary",
        createdAt: new Date().toISOString(),
      });
      return;
    }
    if (p.sessionSummary?.trim()) {
      onAddNotebookEntry({
        id: uid(),
        title: "Session summary",
        content: p.sessionSummary.trim(),
        sourceType: "session_summary",
        createdAt: new Date().toISOString(),
      });
      return;
    }
    onAddNotebookEntry(generateSessionSummaryNote(s.response));
  }, [sessions, onAddNotebookEntry]);

  const onCreateNote = useCallback(() => {
    const entry: NotebookEntry = {
      id: uid(),
      title: "New Note",
      content: "",
      sourceType: "manual",
      createdAt: new Date().toISOString(),
    };
    onAddNotebookEntry(entry);
  }, [onAddNotebookEntry]);

  const onCreateSession = useCallback(() => {
    const s = newSession();
    setSessions((prev) => [s, ...prev]);
    setActiveSessionId(s.id);
    setDisplayMode("teach");
  }, []);

  const onRenameSession = useCallback((sessionId: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              title,
              titleCustomized: true,
              updatedAt: new Date().toISOString(),
            }
          : s,
      ),
    );
  }, []);

  const onDeleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);
      if (remaining.length === 0) {
        const fresh = newSession();
        setActiveSessionId(fresh.id);
        setDisplayMode("teach");
        return [fresh];
      }
      setActiveSessionId((current) => {
        if (current !== sessionId) return current;
        const next = remaining[0]!;
        setDisplayMode(displayModeForSession(next));
        return next.id;
      });
      return remaining;
    });
  }, []);

  const onSwitchSession = useCallback((sessionId: string) => {
    const target = sessions.find((s) => s.id === sessionId);
    if (target) {
      setDisplayMode(displayModeForSession(target));
    }
    setActiveSessionId(sessionId);
  }, [sessions]);

  const onRequestRepair = useCallback(
    async (wrongAnswer: string, question: string): Promise<RepairResult | null> => {
      const sid = activeIdRef.current;
      const session = sessions.find((x) => x.id === sid) ?? sessions[0];
      if (!session) return null;

      const msg =
        `Hint: I answered a quiz question incorrectly.\n\nQuestion: ${question}\nMy answer: ${wrongAnswer}\n\nPlease give feedback, a detailed hint, and a next step. Do not reveal only the correct option letter; help me reason it out. Respond as JSON in repair mode when possible.`;

      try {
        const result = await sendMessage(msg, {
          sessionId: sid,
          conversationId: session.conversationId || undefined,
        });
        const rawPkg = mergeFromApiResult(result);
        const pkg = mergeStickyCozeFields(session.cozePackage, rawPkg);
        const response = cozePackageToTutorResponse(pkg);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sid ? { ...s, cozePackage: pkg, response, updatedAt: new Date().toISOString() } : s,
          ),
        );

        if (result.content.contentType === "repair") {
          return { isCorrect: false, repair: result.content };
        }
        if (result.content.contentType === "explanation") {
          const c = result.content;
          return {
            isCorrect: false,
            repair: {
              contentType: "repair",
              feedback: c.definition,
              hint: c.intuition || c.example,
              nextStep: c.commonMistake || "Re-read the question and try again.",
            },
          };
        }
        return {
          isCorrect: false,
          repair: {
            contentType: "repair",
            feedback: response.message,
            hint: pkg.quiz?.hint || "Compare each option to the core idea in the question before choosing.",
            nextStep: "Eliminate options that contradict the main definition, then submit again.",
          },
        };
      } catch {
        return {
          isCorrect: false,
          repair: {
            contentType: "repair",
            feedback: "Unable to get detailed feedback from the tutor. Please review the material and try again.",
            hint: "Recall the definition first, then eliminate options that clearly don't fit.",
            nextStep: "Go back to the question and select the option that best matches the definition.",
          },
        };
      }
    },
    [sessions, mergeFromApiResult],
  );

  const onRequestCorrectAfterRepair = useCallback(
    async (
      question: string,
      wrongAnswer: string,
      correctAnswer: string,
      explanation: string,
    ): Promise<TutorResponse | null> => {
      const sid = activeIdRef.current;
      const session = sessions.find((x) => x.id === sid) ?? sessions[0];
      if (!session) return null;
      try {
        const result = await sendMessage("", {
          sessionId: sid,
          conversationId: session.conversationId || undefined,
          correctAfterRepair: {
            question,
            wrongAnswer,
            correctAnswer,
            explanation,
          },
        });
        const rawPkg = mergeFromApiResult(result);
        const merged = mergeStickyCozeFields(session.cozePackage, rawPkg);
        const pkg = { ...merged, quiz: session.cozePackage?.quiz ?? merged.quiz };
        const response = cozePackageToTutorResponse(pkg);
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sid) return s;
            return {
              ...s,
              cozePackage: pkg,
              response,
              updatedAt: new Date().toISOString(),
            };
          }),
        );
        return response;
      } catch {
        return null;
      }
    },
    [sessions, mergeFromApiResult],
  );

  const onCozeCorrectAfterRepair = useCallback(
    async (payload: {
      question: string;
      wrongAnswer: string;
      correctAnswer: string;
      explanation: string;
    }) => {
      await onRequestCorrectAfterRepair(
        payload.question,
        payload.wrongAnswer,
        payload.correctAnswer,
        payload.explanation,
      );
    },
    [onRequestCorrectAfterRepair],
  );

  const onQuizComplete = useCallback(() => {
    const sid = activeIdRef.current;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sid
          ? {
              ...s,
              quizSession: undefined,
              quizCleared: true,
              updatedAt: new Date().toISOString(),
            }
          : s,
      ),
    );
  }, []);

  const onCozeQuizExit = useCallback(() => {
    const sid = activeIdRef.current;
    setDisplayMode("teach");
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sid
          ? { ...s, cozeQuizDismissed: true, updatedAt: new Date().toISOString() }
          : s,
      ),
    );
  }, []);

  const sessionItems: AgentSessionItem[] = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    updatedAt: s.updatedAt,
  }));

  const cozeHasQuiz = Boolean(
    active.cozePackage?.quiz?.question && active.cozePackage.quiz.options?.length,
  );

  const showCozeQuiz =
    displayMode === "quiz" &&
    cozeHasQuiz &&
    !active.cozeQuizDismissed;

  const legacyQuiz: QuizSession | null = active.quizCleared
    ? null
    : active.quizSession && active.quizSession.questions?.length
      ? active.quizSession
      : null;

  const quizSession = showCozeQuiz ? null : legacyQuiz;

  return (
    <MainLayout
      response={active.response}
      cozePackage={active.cozePackage}
      displayMode={displayMode}
      showCozeQuiz={showCozeQuiz}
      onCozeQuizExit={onCozeQuizExit}
      onCozeCorrectAfterRepair={onCozeCorrectAfterRepair}
      isDemoMode={false}
      liveTurns={active.liveTurns}
      onSendMessage={onSendMessage}
      onCancelSend={onCancelSend}
      onAddNotebookEntry={onAddNotebookEntry}
      onUpdateNotebookEntry={onUpdateNotebookEntry}
      onRemoveNotebookEntry={onRemoveNotebookEntry}
      onGenerateSummaryNote={onGenerateSummaryNote}
      onCreateNote={onCreateNote}
      workbenchOpen={workbenchOpen}
      onSetWorkbenchOpen={setWorkbenchOpen}
      quizSession={quizSession}
      onRequestRepair={onRequestRepair}
      onRequestCorrectAfterRepair={onRequestCorrectAfterRepair}
      onQuizComplete={onQuizComplete}
      sessions={sessionItems}
      activeSessionId={activeSessionId}
      onSwitchSession={onSwitchSession}
      onCreateSession={onCreateSession}
      onRenameSession={onRenameSession}
      onDeleteSession={onDeleteSession}
      onLearningAction={onLearningAction}
      notebookEntries={active.notebookEntries}
      currentTopic={active.title}
    />
  );
}
