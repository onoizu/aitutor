import type { CozeAgentPackage } from "@/types/agentPackage";
import { EMPTY_COZE_PACKAGE } from "@/lib/normalizeAgentPackage";
import type {
  LearnerState,
  QuizContent,
  QuizOption,
  ResourceItem,
  SessionSummary,
  TutorMode,
  TutorResponse,
} from "@/types/tutor";

const OPTION_IDS = "abcdefghijklmnopqrstuvwxyz".split("");

function str(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

function weakLabel(pkg: CozeAgentPackage): string {
  const w = pkg.weakTopic;
  if (!w) return "";
  if (typeof w === "string") return w.trim();
  return str(w.label ?? w.id ?? "");
}

/* ---------- summary 文本 → 结构化拆分 ---------- */

interface ParsedSections {
  definition: string;
  intuition: string;
  example: string;
  commonMistake: string;
  nextStep: string;
}

const HINT_RE = /💡\s*提示[：:][\s\S]*/;

function classifyHeader(header: string): keyof ParsedSections | null {
  const h = header.toLowerCase();
  if (/next\s*step|下一步|推荐/.test(h)) return "nextStep";
  if (/intuition|直觉|理解/.test(h)) return "intuition";
  if (/example|示例|例子|举例/.test(h)) return "example";
  if (/common\s*mistake|常见错误|误区|易混/.test(h)) return "commonMistake";
  if (/definition|定义/.test(h)) return "definition";
  return null;
}

function parseSummarySections(summary: string): ParsedSections {
  const result: ParsedSections = {
    definition: "",
    intuition: "",
    example: "",
    commonMistake: "",
    nextStep: "",
  };

  if (!summary.trim()) return result;

  const parts = summary.split(/(?=^#{1,3}\s+)/m);

  for (const part of parts) {
    const headerMatch = part.match(/^#{1,3}\s+(.+)/);
    if (!headerMatch) {
      result.definition += part;
      continue;
    }

    const key = classifyHeader(headerMatch[1]);
    const body = part.replace(/^#{1,3}\s+.+\n?/, "").trim();

    if (key) {
      result[key] += (result[key] ? "\n\n" : "") + body;
    } else {
      result.definition += "\n\n" + part;
    }
  }

  result.definition = result.definition.replace(HINT_RE, "").trim();
  result.nextStep = result.nextStep.replace(HINT_RE, "").trim();

  return result;
}

/** 将 Coze 返回的松散 mode 映射到 TutorMode */
export function coerceTutorMode(mode: string): TutorMode {
  const m = mode.toLowerCase().trim();
  if (m === "quiz") return "quiz";
  if (m === "repair") return "repair";
  if (m === "review") return "review";
  if (m === "mindmap") return "mindmap";
  return "teach";
}

export function coerceLearnerState(state: string): LearnerState {
  const allowed: LearnerState[] = [
    "confused_concept",
    "needs_example",
    "ready_for_quiz",
    "wrong_but_fixable",
    "frustrated",
  ];
  const s = state.replace(/-/g, "_").toLowerCase();
  if (allowed.includes(s as LearnerState)) return s as LearnerState;
  if (s.includes("quiz") || s.includes("ready")) return "ready_for_quiz";
  if (s.includes("wrong") || s.includes("fix")) return "wrong_but_fixable";
  if (s.includes("confus")) return "confused_concept";
  return "needs_example";
}

function optionsToQuizOptions(texts: string[]): QuizOption[] {
  return texts.map((text, i) => ({
    id: OPTION_IDS[i] ?? `o${i}`,
    text,
  }));
}

function packageToQuizContent(pkg: CozeAgentPackage): QuizContent | null {
  const q = pkg.quiz;
  if (!q?.question || !q.options?.length) return null;
  const options = optionsToQuizOptions(q.options);
  let correctId = options[0]?.id ?? "a";
  const ca = q.correctAnswer.trim();
  if (ca) {
    const byLetter = /^[a-z]$/i.test(ca);
    if (byLetter) {
      const idx = ca.toLowerCase().charCodeAt(0) - 97;
      if (idx >= 0 && idx < options.length) correctId = options[idx].id;
    } else {
      const hit = options.find(
        (o) =>
          o.text.trim().toLowerCase() === ca.toLowerCase() ||
          ca.toLowerCase().includes(o.text.trim().toLowerCase()) ||
          o.text.trim().toLowerCase().includes(ca.toLowerCase()),
      );
      if (hit) correctId = hit.id;
    }
  }
  return {
    contentType: "quiz",
    question: q.question,
    type: "single_choice",
    options,
    correctAnswer: correctId,
    explanation: q.explanation,
  };
}

function resourcesToPanel(pkg: CozeAgentPackage): ResourceItem[] {
  return pkg.resources.map((r) => {
    const url = r.url?.trim() ?? "";
    const isVideo = /youtube|youtu\.be|bilibili|vimeo/i.test(url);
    return {
      type: isVideo ? "video" : "article",
      title: r.title,
      source: r.channel || undefined,
      reason: r.description || undefined,
      url: url || undefined,
    } satisfies ResourceItem;
  });
}

function sessionSummaryFromPackage(pkg: CozeAgentPackage): SessionSummary | null {
  const text = pkg.sessionSummary.trim();
  if (!text) return null;
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return {
    coveredTopics: lines.length ? lines : [text],
    weakPoints: [],
    recommendation: pkg.nextRecommendation.trim()
      ? {
          id: "next",
          title: pkg.nextRecommendation.trim(),
          detail: undefined,
        }
      : null,
  };
}

/**
 * 供仍使用 TutorResponse 的卡片与类型系统消费；Coze 侧字段由 cozePackage 单独传给侧栏。
 */
/** API 降级为本地 mock（无 cozePackage）时，从 TutorResponse 反推一份 Agent 包供 UI 使用 */
export function inferCozePackageFromTutorResponse(tr: TutorResponse): CozeAgentPackage {
  const base: CozeAgentPackage = {
    ...EMPTY_COZE_PACKAGE,
    mode: tr.mode,
    learningState: tr.learningState,
    weakTopic: tr.weakTopic?.label ?? "",
    mainResponse: { summary: tr.message },
    nextRecommendation: tr.nextRecommendation?.title ?? "",
    noteEntry: { title: "", content: "" },
    sessionSummary: tr.sessionSummary?.coveredTopics?.join("\n") ?? "",
    resources: (tr.recommendedResources ?? []).map((r) => ({
      title: r.title,
      url: r.url ?? "",
      channel: r.source ?? "",
      description: r.reason ?? "",
    })),
  };

  if (tr.content.contentType === "explanation") {
    return {
      ...base,
      mainResponse: { summary: tr.content.definition || tr.message },
    };
  }

  if (tr.content.contentType === "quiz") {
    const q = tr.content;
    const correctId = typeof q.correctAnswer === "string" ? q.correctAnswer : q.correctAnswer[0];
    const correctOpt = q.options.find((o) => o.id === correctId);
    return {
      ...base,
      mode: "quiz",
      quiz: {
        question: q.question,
        options: q.options.map((o) => o.text),
        correctAnswer: correctOpt?.text ?? correctId,
        explanation: q.explanation,
        hint: "",
      },
    };
  }

  return base;
}

export function cozePackageToTutorResponse(pkg: CozeAgentPackage): TutorResponse {
  const summary = pkg.mainResponse.summary.trim();
  const declaredMode = coerceTutorMode(pkg.mode);
  const quiz = declaredMode === "quiz" ? packageToQuizContent(pkg) : null;
  const hasMindMap = declaredMode === "mindmap" && !!pkg.mindmap?.mermaidCode?.trim();
  const effectiveMode: TutorMode = quiz ? "quiz" : hasMindMap ? "mindmap" : declaredMode;
  const weak = weakLabel(pkg);

  const mr = pkg.mainResponse;
  const hasStructuredFields = !!(mr.definition || mr.intuition || mr.example || mr.commonMistake);

  let definition: string;
  let intuition = "";
  let example = "";
  let commonMistake = "";
  let extractedNextStep = "";

  if (hasStructuredFields) {
    definition = mr.definition || summary || "(No content available)";
    intuition = mr.intuition || "";
    example = mr.example || "";
    commonMistake = mr.commonMistake || "";
  } else {
    const parsed = parseSummarySections(summary);
    definition = parsed.definition || summary || "(No content available)";
    intuition = parsed.intuition;
    example = parsed.example;
    commonMistake = parsed.commonMistake;
    extractedNextStep = parsed.nextStep;
  }

  const content = quiz
    ? quiz
    : hasMindMap
      ? ({
          contentType: "mindmap",
          mermaidCode: pkg.mindmap!.mermaidCode,
          title: pkg.mindmap!.title || undefined,
        } as const)
      : ({
          contentType: "explanation",
          definition,
          intuition,
          example,
          commonMistake,
        } as const);

  const nextRecTitle = pkg.nextRecommendation.trim() || extractedNextStep;
  const nextRec = nextRecTitle
    ? {
        id: "next-rec",
        title: nextRecTitle,
        detail: undefined as string | undefined,
      }
    : null;

  const inferredWeak = commonMistake ? commonMistake.split(/[.。!！\n]/)[0].trim().slice(0, 80) : "";

  return {
    intent: effectiveMode === "quiz" ? "ask_question" : "explain_concept",
    learningState: coerceLearnerState(pkg.learningState),
    mode: effectiveMode,
    content,
    message: summary || (quiz ? "Practice question" : ""),
    weakTopic: weak
      ? { id: "weak", label: weak }
      : inferredWeak
        ? { id: "inferred-weak", label: inferredWeak }
        : null,
    nextRecommendation: nextRec,
    sessionSummary: sessionSummaryFromPackage(pkg),
    recommendedResources:
      pkg.resources.length > 0 ? resourcesToPanel(pkg) : undefined,
  };
}
