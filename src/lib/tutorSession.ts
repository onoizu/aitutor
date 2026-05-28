/**
 * Lightweight in-memory session store.
 * Tracks conversation context so the router and prompt builders can make
 * mode decisions and inject relevant history into system prompts.
 */

import type { QuizContent, WeakTopic, TutorMode } from "@/types/tutor";

export interface TutorSessionState {
  conversationId: string;
  currentTopic: string;
  previousMode: TutorMode | null;
  recentMessages: { role: "user" | "assistant"; text: string }[];
  latestQuiz: QuizContent | null;
  weakTopics: WeakTopic[];
  coveredTopics: string[];
}

const MAX_RECENT_MESSAGES = 20;

const store = new Map<string, TutorSessionState>();

export function createSession(): TutorSessionState {
  const id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const session: TutorSessionState = {
    conversationId: id,
    currentTopic: "",
    previousMode: null,
    recentMessages: [],
    latestQuiz: null,
    weakTopics: [],
    coveredTopics: [],
  };
  store.set(id, session);
  return session;
}

export function getSession(id: string): TutorSessionState | undefined {
  return store.get(id);
}

export function getOrCreateSession(id?: string): TutorSessionState {
  if (id) {
    const existing = store.get(id);
    if (existing) return existing;
    const session: TutorSessionState = {
      conversationId: id,
      currentTopic: "",
      previousMode: null,
      recentMessages: [],
      latestQuiz: null,
      weakTopics: [],
      coveredTopics: [],
    };
    store.set(id, session);
    return session;
  }
  return createSession();
}

export function updateSession(
  id: string,
  partial: Partial<TutorSessionState>,
): void {
  const session = store.get(id);
  if (!session) return;
  Object.assign(session, partial);
}

export function addMessage(
  id: string,
  role: "user" | "assistant",
  text: string,
): void {
  const session = store.get(id);
  if (!session) return;
  session.recentMessages.push({ role, text });
  if (session.recentMessages.length > MAX_RECENT_MESSAGES) {
    session.recentMessages = session.recentMessages.slice(
      -MAX_RECENT_MESSAGES,
    );
  }
}

export function setPendingQuiz(id: string, quiz: QuizContent): void {
  const session = store.get(id);
  if (session) session.latestQuiz = quiz;
}

export function clearPendingQuiz(id: string): void {
  const session = store.get(id);
  if (session) session.latestQuiz = null;
}

export function sessionCount(): number {
  return store.size;
}
