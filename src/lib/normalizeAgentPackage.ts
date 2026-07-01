import type {
  CozeAgentPackage,
  CozeMindMapPayload,
  CozeQuizPayload,
  CozeResourceItem,
} from "@/types/agentPackage";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

/** 从模型输出中提取第一个 JSON 对象并 parse（容错 markdown 围栏）。 */
export function extractFirstJsonObject(raw: string): unknown | null {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function parseOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const t = item.trim();
      if (t) out.push(t);
    } else {
      const o = asRecord(item);
      if (o) {
        const t = str(o.text ?? o.label ?? o.value ?? o.title);
        if (t) out.push(t);
      }
    }
  }
  return out;
}

function parseQuiz(json: Record<string, unknown>): CozeQuizPayload | null {
  const q = asRecord(json.quiz ?? json.quiz_question);
  if (!q) return null;
  const question = str(q.question);
  const options = parseOptions(q.options);
  if (!question || options.length === 0) return null;
  return {
    question,
    options,
    correctAnswer: str(q.correctAnswer ?? q.correct_answer),
    explanation: str(q.explanation),
    hint: str(q.hint),
  };
}

function cleanMarkdownText(value: string): string {
  return value
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferMarkdownQuiz(rawText: string): CozeQuizPayload | null {
  const text = rawText.trim();
  const questionMatch =
    text.match(/(?:^|\n)\s*(?:#+\s*)?(?:\*\*)?Question(?:\*\*)?\s*[:：]\s*([\s\S]*?)(?=\n\s*(?:\*\*)?Options|\n\s*[-*]?\s*[A-Da-d][).:-]\s|\n\s*---|$)/i);
  const optionMatches = Array.from(text.matchAll(/^\s*[-*]?\s*([A-Da-d])[).:-]\s*(.+)$/gm));

  const question = cleanMarkdownText(questionMatch?.[1] ?? "");
  const options = optionMatches
    .map((match) => `${match[1].toUpperCase()}) ${cleanMarkdownText(match[2] ?? "")}`)
    .filter((option) => option.length > 3);

  if (!question || options.length < 2) return null;

  const correctMatch = text.match(/(?:correct\s*answer|answer)\s*[:：]\s*(?:\*\*)?\s*([A-Da-d])(?:[).:-]\s*)?([^\n*]*)/i);
  const hintMatch = text.match(/(?:\*\*)?Hint(?:\*\*)?\s*[:：]\s*([\s\S]*?)(?=\n\s*---|\n\s*#+|\n\s*(?:\*\*)?(?:Explanation|Resources|Correct\s*Answer)|$)/i);
  const explanationMatch = text.match(/(?:\*\*)?Explanation(?:\*\*)?\s*[:：]\s*([\s\S]*?)(?=\n\s*---|\n\s*#+|\n\s*(?:\*\*)?(?:Hint|Resources)|$)/i);

  return {
    question,
    options,
    correctAnswer: correctMatch?.[1]?.toUpperCase() ?? "",
    explanation: cleanMarkdownText(explanationMatch?.[1] ?? ""),
    hint: cleanMarkdownText(hintMatch?.[1] ?? ""),
  };
}

function parseResources(raw: unknown): CozeResourceItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CozeResourceItem[] = [];
  for (const item of raw) {
    const o = asRecord(item);
    if (!o) continue;
    const title = str(o.title);
    if (!title) continue;
    out.push({
      title,
      url: str(o.url),
      channel: str(o.channel ?? o.source),
      description: str(o.description ?? o.reason),
    });
  }
  return out;
}

function parseMainResponse(json: Record<string, unknown>): import("@/types/agentPackage").CozeMainResponse {
  const flat = str(json.summary ?? json.answer);
  const mr = asRecord(json.mainResponse ?? json.main_response);
  if (mr) {
    const s = str(mr.summary);
    return {
      summary: s || flat,
      definition: str(mr.definition),
      intuition: str(mr.intuition),
      example: str(mr.example),
      commonMistake: str(mr.commonMistake ?? mr.common_mistake),
    };
  }
  return { summary: flat };
}

function parseMindMap(json: Record<string, unknown>): CozeMindMapPayload | null {
  const raw = json.mindmap ?? json.mind_map;
  if (typeof raw === "string" && raw.trim()) {
    return { mermaidCode: raw.trim(), title: "" };
  }
  const obj = asRecord(raw);
  if (!obj) {
    const content = asRecord(json.content);
    if (content && str(content.contentType ?? content.content_type) === "mindmap") {
      const code = str(content.mermaidCode ?? content.mermaid_code);
      if (code) return { mermaidCode: code, title: str(content.title) };
    }
    return null;
  }
  const code = str(obj.mermaidCode ?? obj.mermaid_code ?? obj.code);
  if (!code) return null;
  return { mermaidCode: code, title: str(obj.title) };
}

function parseNoteEntry(json: Record<string, unknown>): { title: string; content: string } {
  const ne = asRecord(json.noteEntry ?? json.note_entry);
  if (ne) {
    return { title: str(ne.title), content: str(ne.content) };
  }
  return { title: "", content: "" };
}

export const EMPTY_COZE_PACKAGE: CozeAgentPackage = {
  mode: "teach",
  learningState: "needs_example",
  weakTopic: "",
  mainResponse: { summary: "" },
  quiz: null,
  mindmap: null,
  resources: [],
  nextRecommendation: "",
  noteEntry: { title: "", content: "" },
  sessionSummary: "",
};

/**
 * 将 Coze 助手返回的纯文本解析为统一的 AgentPackage。
 */
export function normalizeCozeAgentPackage(rawText: string): CozeAgentPackage {
  const parsed = extractFirstJsonObject(rawText);
  const json = asRecord(parsed);
  if (!json) {
    const inferredQuiz = inferMarkdownQuiz(rawText);
    if (inferredQuiz) {
      return {
        ...EMPTY_COZE_PACKAGE,
        mode: "quiz",
        learningState: "ready_for_quiz",
        mainResponse: { summary: rawText.trim().slice(0, 8000) },
        quiz: inferredQuiz,
        nextRecommendation: "Review the explanation after answering, then try one more practice question.",
      };
    }

    return {
      ...EMPTY_COZE_PACKAGE,
      mainResponse: { summary: rawText.trim().slice(0, 8000) },
      mode: "teach",
    };
  }

  const weakRaw = json.weakTopic ?? json.weak_topic;
  const weakTopic =
    typeof weakRaw === "string" || weakRaw === null
      ? weakRaw === null
        ? ""
        : str(weakRaw)
      : (weakRaw as { id?: string; label?: string });

  const pkg: CozeAgentPackage = {
    mode: str(json.mode) || "teach",
    learningState: str(json.learningState ?? json.learning_state) || "needs_example",
    weakTopic,
    mainResponse: parseMainResponse(json),
    quiz: parseQuiz(json),
    mindmap: parseMindMap(json),
    resources: parseResources(json.resources ?? json.recommended_resources),
    nextRecommendation: str(json.nextRecommendation ?? json.next_recommendation),
    noteEntry: parseNoteEntry(json),
    sessionSummary: str(json.sessionSummary ?? json.session_summary),
  };

  return pkg;
}
