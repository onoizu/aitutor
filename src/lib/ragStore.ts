import { readJsonFile, writeJsonFile } from "@/lib/localDataStore";

const STORE_FILE = "course-knowledge.json";
const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 180;
const MAX_CONTEXT_CHARS = 4500;

export interface CourseChunk {
  id: string;
  materialId: string;
  title: string;
  content: string;
  uploadedAt: string;
  sessionId?: string;
}

export interface CourseMaterial {
  id: string;
  title: string;
  fileType?: string;
  sessionId?: string;
  uploadedAt: string;
  chunks: CourseChunk[];
}

interface CourseKnowledgeStore {
  version: 1;
  materials: CourseMaterial[];
}

export interface RetrievedCourseChunk extends CourseChunk {
  score: number;
}

const EMPTY_STORE: CourseKnowledgeStore = { version: 1, materials: [] };

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeText(text: string): string {
  return text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function tokenize(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .match(/[a-z0-9_+#.-]{2,}|[\u4e00-\u9fff]{1,}/g) ?? [],
    ),
  ).filter((token) => token.length > 1 || /[\u4e00-\u9fff]/.test(token));
}

function chunkText(text: string): string[] {
  const clean = normalizeText(text);
  if (!clean) return [];

  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).trim().length <= CHUNK_SIZE) {
      current = (current ? `${current}\n\n` : "") + paragraph;
      continue;
    }
    if (current.trim()) chunks.push(current.trim());
    current = paragraph;

    while (current.length > CHUNK_SIZE) {
      chunks.push(current.slice(0, CHUNK_SIZE).trim());
      current = current.slice(Math.max(0, CHUNK_SIZE - CHUNK_OVERLAP)).trim();
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

async function readStore(): Promise<CourseKnowledgeStore> {
  const store = await readJsonFile<CourseKnowledgeStore>(STORE_FILE, EMPTY_STORE);
  return {
    version: 1,
    materials: Array.isArray(store.materials) ? store.materials : [],
  };
}

async function writeStore(store: CourseKnowledgeStore) {
  await writeJsonFile(STORE_FILE, store);
}

export async function ingestCourseDocument(input: {
  title: string;
  text: string;
  fileType?: string;
  sessionId?: string;
}): Promise<CourseMaterial | null> {
  const chunks = chunkText(input.text);
  if (chunks.length === 0) return null;

  const uploadedAt = new Date().toISOString();
  const materialId = uid("mat");
  const material: CourseMaterial = {
    id: materialId,
    title: input.title,
    fileType: input.fileType,
    sessionId: input.sessionId,
    uploadedAt,
    chunks: chunks.map((content, i) => ({
      id: `${materialId}-chunk-${i + 1}`,
      materialId,
      title: input.title,
      content,
      uploadedAt,
      sessionId: input.sessionId,
    })),
  };

  const store = await readStore();
  const duplicateIndex = store.materials.findIndex(
    (m) => m.title === material.title && m.sessionId === material.sessionId,
  );
  if (duplicateIndex >= 0) {
    store.materials.splice(duplicateIndex, 1, material);
  } else {
    store.materials.push(material);
  }
  await writeStore(store);
  return material;
}

function scoreChunk(queryTokens: string[], chunk: CourseChunk): number {
  if (queryTokens.length === 0) return 0;
  const content = chunk.content.toLowerCase();
  const title = chunk.title.toLowerCase();
  let score = 0;

  for (const token of queryTokens) {
    if (title.includes(token)) score += 4;
    const matches = content.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
    if (matches) score += Math.min(matches.length, 6);
  }

  return score / Math.sqrt(Math.max(1, chunk.content.length / 600));
}

export async function retrieveCourseContext(
  query: string,
  options: { sessionId?: string; limit?: number } = {},
): Promise<RetrievedCourseChunk[]> {
  const store = await readStore();
  const queryTokens = tokenize(query);
  const allChunks = store.materials.flatMap((m) => m.chunks);

  return allChunks
    .map((chunk) => {
      const sessionBoost = options.sessionId && chunk.sessionId === options.sessionId ? 1.25 : 1;
      return { ...chunk, score: scoreChunk(queryTokens, chunk) * sessionBoost };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 5);
}

export function formatCourseContext(chunks: RetrievedCourseChunk[]): string {
  if (chunks.length === 0) return "";
  let used = 0;
  const parts: string[] = [];
  for (const chunk of chunks) {
    const header = `[${chunk.title} / ${chunk.id} / score ${chunk.score.toFixed(2)}]`;
    const body = chunk.content.trim();
    if (used + header.length + body.length > MAX_CONTEXT_CHARS) break;
    parts.push(`${header}\n${body}`);
    used += header.length + body.length;
  }
  return parts.join("\n\n---\n\n");
}

export async function getCourseKnowledgeStats(): Promise<{
  materials: number;
  chunks: number;
}> {
  const store = await readStore();
  return {
    materials: store.materials.length,
    chunks: store.materials.reduce((sum, m) => sum + m.chunks.length, 0),
  };
}
