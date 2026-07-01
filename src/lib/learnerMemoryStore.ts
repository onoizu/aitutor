import type { CozeAgentPackage } from "@/types/agentPackage";
import { readJsonFile, writeJsonFile } from "@/lib/localDataStore";

const STORE_FILE = "learner-memory.json";

export interface WeakTopicMemory {
  label: string;
  count: number;
  lastSeenAt: string;
}

export interface StudyPlanItem {
  id: string;
  title: string;
  reason: string;
  status: "todo" | "doing" | "done";
  createdAt: string;
  updatedAt: string;
}

export interface FeynmanAttempt {
  id: string;
  prompt: string;
  feedback: string;
  createdAt: string;
}

export interface LearnerMemory {
  sessionId: string;
  coveredTopics: string[];
  weakTopics: WeakTopicMemory[];
  studyPlan: StudyPlanItem[];
  feynmanAttempts: FeynmanAttempt[];
  lastUpdatedAt: string;
}

interface LearnerMemoryStore {
  version: 1;
  memories: Record<string, LearnerMemory>;
}

const EMPTY_STORE: LearnerMemoryStore = { version: 1, memories: {} };

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanLabel(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    const obj = value as { label?: unknown; id?: unknown };
    return String(obj.label ?? obj.id ?? "").trim();
  }
  return String(value).trim();
}

function shortTopicFromText(text: string): string {
  const firstLine = text.split(/\n+/).map((line) => line.trim()).find(Boolean) ?? "";
  return firstLine.replace(/^#+\s*/, "").slice(0, 90);
}

async function readStore(): Promise<LearnerMemoryStore> {
  const store = await readJsonFile<LearnerMemoryStore>(STORE_FILE, EMPTY_STORE);
  return {
    version: 1,
    memories: store.memories && typeof store.memories === "object" ? store.memories : {},
  };
}

async function writeStore(store: LearnerMemoryStore) {
  await writeJsonFile(STORE_FILE, store);
}

export async function getLearnerMemory(sessionId: string): Promise<LearnerMemory> {
  const store = await readStore();
  const existing = store.memories[sessionId];
  if (existing) return existing;

  const now = new Date().toISOString();
  return {
    sessionId,
    coveredTopics: [],
    weakTopics: [],
    studyPlan: [],
    feynmanAttempts: [],
    lastUpdatedAt: now,
  };
}

async function saveMemory(memory: LearnerMemory) {
  const store = await readStore();
  store.memories[memory.sessionId] = memory;
  await writeStore(store);
}

function addUnique(list: string[], value: string, max = 20): string[] {
  const clean = value.trim();
  if (!clean) return list;
  return [clean, ...list.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, max);
}

function upsertWeakTopic(memory: LearnerMemory, label: string, now: string) {
  const clean = label.trim();
  if (!clean) return;
  const hit = memory.weakTopics.find((item) => item.label.toLowerCase() === clean.toLowerCase());
  if (hit) {
    hit.count += 1;
    hit.lastSeenAt = now;
    return;
  }
  memory.weakTopics.unshift({ label: clean, count: 1, lastSeenAt: now });
  memory.weakTopics = memory.weakTopics.slice(0, 12);
}

function upsertStudyPlan(memory: LearnerMemory, title: string, reason: string, now: string) {
  const clean = title.trim();
  if (!clean) return;
  const existing = memory.studyPlan.find((item) => item.title.toLowerCase() === clean.toLowerCase());
  if (existing) {
    existing.reason = reason || existing.reason;
    existing.updatedAt = now;
    if (existing.status === "done") existing.status = "todo";
    return;
  }
  memory.studyPlan.unshift({
    id: uid("plan"),
    title: clean,
    reason,
    status: "todo",
    createdAt: now,
    updatedAt: now,
  });
  memory.studyPlan = memory.studyPlan.slice(0, 10);
}

export async function updateLearnerMemoryFromPackage(input: {
  sessionId: string;
  userMessage: string;
  pkg: CozeAgentPackage;
}): Promise<LearnerMemory> {
  const memory = await getLearnerMemory(input.sessionId);
  const now = new Date().toISOString();
  const weak = cleanLabel(input.pkg.weakTopic);
  const summaryTopic = shortTopicFromText(
    input.pkg.mainResponse.definition || input.pkg.mainResponse.summary || input.userMessage,
  );

  if (summaryTopic) memory.coveredTopics = addUnique(memory.coveredTopics, summaryTopic);
  if (weak) upsertWeakTopic(memory, weak, now);
  if (input.pkg.nextRecommendation.trim()) {
    upsertStudyPlan(memory, input.pkg.nextRecommendation.trim(), weak ? `Recommended after weak topic: ${weak}` : "Recommended by tutor", now);
  }

  if (/feynman|reverse[-\s]?teach|用自己的话|反向教学/i.test(input.userMessage)) {
    memory.feynmanAttempts.unshift({
      id: uid("feynman"),
      prompt: input.userMessage.slice(0, 800),
      feedback: input.pkg.mainResponse.summary.slice(0, 1600),
      createdAt: now,
    });
    memory.feynmanAttempts = memory.feynmanAttempts.slice(0, 8);
  }

  memory.lastUpdatedAt = now;
  await saveMemory(memory);
  return memory;
}

export async function markPlanItemDone(sessionId: string, planId: string): Promise<LearnerMemory> {
  const memory = await getLearnerMemory(sessionId);
  const now = new Date().toISOString();
  memory.studyPlan = memory.studyPlan.map((item) =>
    item.id === planId ? { ...item, status: "done", updatedAt: now } : item,
  );
  memory.lastUpdatedAt = now;
  await saveMemory(memory);
  return memory;
}

export function formatLearnerMemoryContext(memory: LearnerMemory): string {
  const weak = memory.weakTopics
    .slice(0, 5)
    .map((item) => `${item.label} (${item.count}x)`)
    .join(", ");
  const plan = memory.studyPlan
    .filter((item) => item.status !== "done")
    .slice(0, 5)
    .map((item, i) => `${i + 1}. ${item.title}${item.reason ? ` — ${item.reason}` : ""}`)
    .join("\n");
  const feynman = memory.feynmanAttempts[0]?.feedback.slice(0, 500) ?? "";

  return [
    memory.coveredTopics.length ? `Covered topics: ${memory.coveredTopics.slice(0, 8).join("; ")}` : "",
    weak ? `Weak-topic profile: ${weak}` : "",
    plan ? `Open study plan:\n${plan}` : "",
    feynman ? `Latest Feynman feedback:\n${feynman}` : "",
  ].filter(Boolean).join("\n\n");
}

export async function getLearnerMemoryStats(): Promise<{ sessions: number; planItems: number; weakTopics: number }> {
  const store = await readStore();
  const memories = Object.values(store.memories);
  return {
    sessions: memories.length,
    planItems: memories.reduce((sum, memory) => sum + memory.studyPlan.length, 0),
    weakTopics: memories.reduce((sum, memory) => sum + memory.weakTopics.length, 0),
  };
}
