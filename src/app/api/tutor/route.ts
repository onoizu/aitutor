import { NextResponse } from "next/server";
import type { TutorResponse } from "@/types/tutor";
import { cozeChatCompletion } from "@/lib/cozeClient";
import { addMessage, getOrCreateSession } from "@/lib/tutorSession";
import { extractTextFromFileDetailed } from "@/lib/documentParser";
import { chatCompletion, type ChatMessage } from "@/lib/modelClient";
import { normalizeCozeAgentPackage, EMPTY_COZE_PACKAGE } from "@/lib/normalizeAgentPackage";
import { cozePackageToTutorResponse } from "@/lib/cozePackageAdapter";
import { formatCourseContext, ingestCourseDocument, retrieveCourseContext } from "@/lib/ragStore";
import {
  formatFileSize,
  validateUploadFile,
  type UploadedAttachmentKind,
} from "@/lib/uploadConstraints";
import {
  formatLearnerMemoryContext,
  getLearnerMemory,
  updateLearnerMemoryFromPackage,
} from "@/lib/learnerMemoryStore";

export const maxDuration = 120;

interface TutorRequestBody {
  message: string;
  sessionId?: string;
  conversationId?: string;
  correctAfterRepair?: {
    question: string;
    wrongAnswer: string;
    correctAnswer: string;
    explanation: string;
  };
}

function fileFromForm(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function validateIncomingUpload(file: File, kind: UploadedAttachmentKind) {
  const error = validateUploadFile(file, kind);
  if (!error) return null;
  const status = /smaller/i.test(error) ? 413 : 400;
  return NextResponse.json({ error }, { status });
}

function uploadDescriptor(file: File, kind: UploadedAttachmentKind): string {
  const label = kind === "image" ? "Uploaded image" : "Uploaded document";
  return `${label}: ${file.name} (${file.type || "unknown type"}, ${formatFileSize(file.size)})`;
}

function buildCozeCorrectAfterRepairUserMessage(p: {
  question: string;
  wrongAnswer: string;
  correctAnswer: string;
  explanation: string;
}): string {
  return (
    `[Output only the same single JSON object as in your system instructions — no markdown, no extra text.]\n` +
    `The learner first answered wrong, saw your hint, then chose correctly.\n` +
    `Question: ${p.question}\n` +
    `Wrong answer was: ${p.wrongAnswer}\n` +
    `Correct answer: ${p.correctAnswer}\n` +
    `Explanation: ${p.explanation}\n` +
    `Return a brief repair follow-up only: mode "repair", weakTopic if useful, nextRecommendation if useful, and a mainResponse.summary under 50 words. ` +
    `Do not generate resources, sessionSummary, or noteEntry.`
  );
}

const QUIZ_REQUEST_RE =
  /\b(q?uiz|测验|测试|出题|做题|小测|练习|来道题|考考我|quick\s*check)\b/i;
const REVIEW_REQUEST_RE =
  /\b(review|session\s*review|summary|summari[sz]e|总结|回顾|复习|study\s*plan|学习计划)\b/i;
const REPAIR_REQUEST_RE =
  /\b(repair|hint|incorrect|wrong|misconception|答错|错了|提示|修正)\b/i;

function isQuizRequest(text: string): boolean {
  return QUIZ_REQUEST_RE.test(text);
}

function modeOutputInstruction(input: {
  query: string;
  correctAfterRepair: boolean;
}): string {
  if (input.correctAfterRepair) {
    return [
      "[Mode budget: repair follow-up]",
      "Return one valid JSON object only.",
      "Keep the response short: mainResponse.summary under 50 words.",
      "Allowed fields: mode, learningState, weakTopic, mainResponse, nextRecommendation.",
      "Do not include resources, sessionSummary, noteEntry, mindmap, or a new quiz.",
    ].join("\n");
  }

  if (QUIZ_REQUEST_RE.test(input.query)) {
    return [
      "[Mode budget: quiz only]",
      "Return one valid JSON object only.",
      "Set mode to \"quiz\" and learningState to \"ready_for_quiz\".",
      "Fill only quiz: question, exactly 4 options, correctAnswer, explanation, hint.",
      "Keep explanation under 2 sentences and hint under 1 sentence.",
      "Leave resources empty, sessionSummary empty, noteEntry empty, nextRecommendation empty.",
      "Do not include a long mainResponse explanation.",
    ].join("\n");
  }

  if (REPAIR_REQUEST_RE.test(input.query)) {
    return [
      "[Mode budget: repair only]",
      "Return one valid JSON object only.",
      "Set mode to \"repair\" and learningState to \"wrong_but_fixable\".",
      "Give only a concise hint/feedback in mainResponse.summary, under 70 words.",
      "Fill weakTopic if clear.",
      "Do not include resources, sessionSummary, noteEntry, or a new quiz.",
    ].join("\n");
  }

  if (REVIEW_REQUEST_RE.test(input.query)) {
    return [
      "[Mode budget: review]",
      "Return one valid JSON object only.",
      "Set mode to \"review\".",
      "This is the only mode where sessionSummary and resources should be generated.",
      "Keep sessionSummary concise, return at most 3 resources, and include nextRecommendation.",
    ].join("\n");
  }

  return [
    "[Mode budget: teach]",
    "Return one valid JSON object only.",
    "Set mode to \"teach\".",
    "Keep mainResponse concise and focused on the user's question.",
    "Do not generate resources, sessionSummary, or noteEntry unless the user explicitly asks for review/resources.",
  ].join("\n");
}

function quizTopicFrom(text: string): string {
  const clean = text
    .replace(/\[Context:[\s\S]*?\]\s*/g, "")
    .replace(/This is a quiz request[\s\S]*/i, "")
    .trim();
  const match = clean.match(/\b(?:about|on|for)\s+([^.?。！？\n]+)/i);
  return (match?.[1] ?? clean.replace(QUIZ_REQUEST_RE, "")).trim().slice(0, 80) || "the current topic";
}

function temporaryQuizPackage(query: string, err: unknown): ReturnType<typeof normalizeCozeAgentPackage> {
  const topic = quizTopicFrom(query);
  const reason = err instanceof Error ? err.message : String(err);

  if (/linear\s+regression/i.test(topic)) {
    return {
      ...EMPTY_COZE_PACKAGE,
      mode: "quiz",
      learningState: "ready_for_quiz",
      mainResponse: {
        summary: `Coze is temporarily unavailable, so here is a local quiz card for ${topic}.`,
      },
      quiz: {
        question: "What is the primary goal of linear regression?",
        options: [
          "A) To classify inputs into discrete categories",
          "B) To model the relationship between input variables and a continuous target",
          "C) To group similar data points without labels",
          "D) To remove all error from a dataset before training",
        ],
        correctAnswer: "B",
        explanation:
          "Linear regression learns a linear relationship that predicts a continuous value from one or more input features.",
        hint: "Think about whether the target is a category or a numeric value.",
      },
      weakTopic: "Linear regression objective",
      nextRecommendation: "Review cost functions and the meaning of residual error in linear regression.",
      noteEntry: {
        title: "Linear regression quiz",
        content: `Temporary local quiz generated because Coze returned: ${reason.slice(0, 180)}`,
      },
    };
  }

  return {
    ...EMPTY_COZE_PACKAGE,
    mode: "quiz",
    learningState: "ready_for_quiz",
    mainResponse: {
      summary: `Coze is temporarily unavailable, so here is a local quiz card for ${topic}.`,
    },
    quiz: {
      question: `Which study action best checks whether you understand ${topic}?`,
      options: [
        "A) Memorize one sentence without applying it",
        "B) Explain the idea in your own words and test it on a small example",
        "C) Skip examples and move to a new topic immediately",
        "D) Only reread the title of the lesson",
      ],
      correctAnswer: "B",
      explanation:
        "A good quiz checks understanding by requiring explanation and transfer to a concrete example.",
      hint: "Choose the option that asks you to actively apply the idea.",
    },
    weakTopic: topic,
    nextRecommendation: `Try one worked example for ${topic}, then ask for another quiz.`,
    noteEntry: {
      title: `${topic} quiz`,
      content: `Temporary local quiz generated because Coze returned: ${reason.slice(0, 180)}`,
    },
  };
}

function ensureGradableQuizPackage(
  pkg: ReturnType<typeof normalizeCozeAgentPackage>,
  query: string,
): ReturnType<typeof normalizeCozeAgentPackage> {
  if (!isQuizRequest(query)) return pkg;
  if (pkg.quiz?.question && pkg.quiz.options.length >= 2 && pkg.quiz.correctAnswer.trim()) {
    return { ...pkg, mode: "quiz", learningState: pkg.learningState || "ready_for_quiz" };
  }
  return temporaryQuizPackage(query, "The tutor response did not include a gradable correctAnswer.");
}

function enforceModeBudget(
  pkg: ReturnType<typeof normalizeCozeAgentPackage>,
  query: string,
  correctAfterRepair: boolean,
): ReturnType<typeof normalizeCozeAgentPackage> {
  const emptyHeavyFields = {
    resources: [],
    sessionSummary: "",
    noteEntry: { title: "", content: "" },
  };

  if (correctAfterRepair || REPAIR_REQUEST_RE.test(query)) {
    return {
      ...pkg,
      ...emptyHeavyFields,
      quiz: null,
      mindmap: null,
      mode: pkg.mode === "repair" ? pkg.mode : "repair",
    };
  }

  if (QUIZ_REQUEST_RE.test(query)) {
    return {
      ...pkg,
      ...emptyHeavyFields,
      nextRecommendation: "",
      mindmap: null,
      mode: "quiz",
    };
  }

  if (REVIEW_REQUEST_RE.test(query)) {
    return pkg;
  }

  return {
    ...pkg,
    ...emptyHeavyFields,
  };
}

function jsonResult(
  pkg: ReturnType<typeof normalizeCozeAgentPackage>,
  conversationId: string,
): TutorResponse & { cozePackage: typeof pkg; _conversationId: string } {
  const response = cozePackageToTutorResponse(pkg);
  return {
    ...response,
    cozePackage: pkg,
    _conversationId: conversationId,
  };
}

async function buildPersistentContext(input: {
  sessionId: string;
  query: string;
}): Promise<string> {
  const parts: string[] = [];

  try {
    const memory = await getLearnerMemory(input.sessionId);
    const memoryContext = formatLearnerMemoryContext(memory);
    if (memoryContext) {
      parts.push(`[Persistent learner memory]\n${memoryContext}`);
    }
  } catch (err) {
    console.warn("[tutor/route] learner memory unavailable:", err);
  }

  try {
    const retrieved = await retrieveCourseContext(input.query, {
      sessionId: input.sessionId,
      limit: 5,
    });
    const courseContext = formatCourseContext(retrieved);
    if (courseContext) {
      parts.push(
        `[Retrieved course-grounded context]\n` +
          `Use this material when relevant. If it conflicts with general knowledge, prefer the course material.\n\n` +
          courseContext,
      );
    }
  } catch (err) {
    console.warn("[tutor/route] course retrieval unavailable:", err);
  }

  return parts.join("\n\n");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function customModelConfigured() {
  return Boolean(process.env.CUSTOM_API_URL && process.env.CUSTOM_API_KEY);
}

function isRetryableCozeError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /status=failed|server issues|try your request again|temporar|timeout|empty assistant/i.test(msg);
}

async function callTutorModel(
  messages: ChatMessage[],
  conversationId: string | undefined,
  imageFile: File | null,
  documentFile: File | null,
  clientSessionId: string | undefined,
): Promise<{ text: string; conversationId: string; provider: "coze" | "custom" }> {
  let lastCozeErr: unknown;
  const maxAttempts = process.env.NETLIFY ? 1 : 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await cozeChatCompletion(
        messages,
        attempt === 1 ? conversationId : undefined,
        imageFile,
        documentFile,
        clientSessionId,
      );
      return { ...result, provider: "coze" };
    } catch (cozeErr) {
      lastCozeErr = cozeErr;
      console.error("[tutor/route] Coze API request failed attempt %d/%d", attempt, maxAttempts, cozeErr);
      if (attempt < maxAttempts && isRetryableCozeError(cozeErr)) {
        await sleep(1200 * attempt);
        continue;
      }
      break;
    }
  }

  if (!customModelConfigured()) {
    throw lastCozeErr instanceof Error ? lastCozeErr : new Error(String(lastCozeErr));
  }

  try {
    const text = await chatCompletion(messages);
    return {
      text,
      conversationId: conversationId || clientSessionId || getOrCreateSession().conversationId,
      provider: "custom",
    };
  } catch (customErr) {
    console.error("[tutor/route] Custom model fallback failed", customErr);
    throw lastCozeErr instanceof Error ? lastCozeErr : customErr;
  }
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const useStream = url.searchParams.get("stream") === "1";

  let userMessage = "";
  let incomingConversationId: string | undefined;
  /** 与前端 Agent Session id 一致，用于 Coze 稳定 user_id */
  let clientSessionId: string | undefined;
  let correctAfterRepairPayload: TutorRequestBody["correctAfterRepair"] | undefined;
  let imageFile: File | null = null;
  let documentFileForCoze: File | null = null;
  let userQueryForRetrieval = "";

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    userMessage = (formData.get("message") as string)?.trim() ?? "";
    incomingConversationId =
      (formData.get("conversationId") as string) || undefined;
    clientSessionId =
      (formData.get("sessionId") as string)?.trim() || undefined;
    imageFile = fileFromForm(formData, "image");
    if (imageFile) {
      const invalid = validateIncomingUpload(imageFile, "image");
      if (invalid) return invalid;
      console.log(
        "[tutor/route] image upload: name=%s size=%d type=%s",
        imageFile.name, imageFile.size, imageFile.type,
      );
    }

    const documentFile = fileFromForm(formData, "document");
    if (documentFile) {
      const invalid = validateIncomingUpload(documentFile, "document");
      if (invalid) return invalid;
      console.log(
        "[tutor/route] document upload: name=%s size=%d type=%s",
        documentFile.name, documentFile.size, documentFile.type,
      );
      const extraction = await extractTextFromFileDetailed(documentFile);
      const docText = extraction.text;
      const prompt = userMessage || "Answer based on this document";
      userQueryForRetrieval = prompt;
      if (docText) {
        console.log("[tutor/route] document parsed OK, text length=%d", docText.length);
        await ingestCourseDocument({
          title: documentFile.name,
          text: docText,
          fileType: documentFile.type || documentFile.name.split(".").pop(),
          sessionId: clientSessionId,
        });
        userMessage =
          `[${uploadDescriptor(documentFile, "document")}]\n\n` +
          `[Document content]\n${docText}\n\n` +
          `[User question] ${prompt}`;
      } else {
        documentFileForCoze = documentFile;
        console.warn("[tutor/route] document extraction returned empty for:", documentFile.name);
        userMessage =
          `[The user uploaded a document "${documentFile.name}" (${formatFileSize(documentFile.size)}) ` +
          `but local text extraction did not produce usable text. Reason: ${extraction.reason ?? "unknown"}. ` +
          `The original document is attached to this Coze message as a file object. ` +
          `Try to answer from the attached file. If the file is a scanned/image-only PDF and cannot be read, ` +
          `ask the learner to upload page screenshots or OCR text.]\n\n` +
          `[User question] ${prompt}`;
      }
    }

    if (imageFile) {
      const prompt = userMessage || userQueryForRetrieval || "Analyze this image";
      userQueryForRetrieval = userQueryForRetrieval || prompt;
      userMessage =
        `[${uploadDescriptor(imageFile, "image")}]\n` +
        `The actual image is attached to this Coze message as an image object. ` +
        `Use visual details from the image when answering.\n\n` +
        prompt;
    }
  } else {
    let body: TutorRequestBody;
    try {
      body = (await req.json()) as TutorRequestBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    userMessage = body.message?.trim() ?? "";
    userQueryForRetrieval = userMessage;
    incomingConversationId = body.conversationId;
    clientSessionId = body.sessionId?.trim() || undefined;
    correctAfterRepairPayload = body.correctAfterRepair;
  }

  if (!userQueryForRetrieval) {
    userQueryForRetrieval = correctAfterRepairPayload?.question ?? userMessage;
  }

  const hasImage = Boolean(imageFile && imageFile.size > 0);
  if (!userMessage && !correctAfterRepairPayload && !hasImage) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  const MAX_USER_MESSAGE_LENGTH = 8000;
  if (userMessage.length > MAX_USER_MESSAGE_LENGTH) {
    userMessage =
      userMessage.slice(0, MAX_USER_MESSAGE_LENGTH) +
      "\n\n[Document truncated for API. Consider summarizing before asking.]";
  }

  const persistentSessionId =
    clientSessionId || incomingConversationId || getOrCreateSession().conversationId;
  const persistentContext = await buildPersistentContext({
    sessionId: persistentSessionId,
    query: userQueryForRetrieval || userMessage,
  });
  const modeInstruction = modeOutputInstruction({
    query: userQueryForRetrieval || userMessage,
    correctAfterRepair: Boolean(correctAfterRepairPayload),
  });

  let messages: ChatMessage[];
  if (correctAfterRepairPayload) {
    messages = [
      {
        role: "user",
        content:
          `${modeInstruction}\n\n` +
          (persistentContext ? `${persistentContext}\n\n` : "") +
          buildCozeCorrectAfterRepairUserMessage(correctAfterRepairPayload),
      },
    ];
  } else {
    const text =
      userMessage ||
      (hasImage ? "Please answer based on the uploaded image and output only the agreed-upon JSON." : "");
    messages = [
      {
        role: "user",
        content:
          `${modeInstruction}\n\n` +
          (persistentContext
            ? `${persistentContext}\n\n[Current user request]\n${text}`
            : `[Current user request]\n${text}`),
      },
    ];
  }

  try {
    if (useStream) {
      const encoder = new TextEncoder();
      let streamClosed = false;
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      const stream = new ReadableStream({
        async start(controller) {
          let rawText = "";
          let cozeConversationId = incomingConversationId ?? "";
          const send = (payload: unknown) => {
            if (!streamClosed) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            }
          };
          heartbeat = setInterval(() => {
            send({ t: "heartbeat" });
          }, 8000);

          try {
            send({ t: "heartbeat" });
            const result = await callTutorModel(
              messages,
              incomingConversationId,
              hasImage ? imageFile : null,
              documentFileForCoze,
              clientSessionId,
            );
            rawText = result.text;
            cozeConversationId = result.conversationId;
          } catch (err) {
            console.error("[tutor] stream failed", err);
            clearInterval(heartbeat);
            if (isQuizRequest(userQueryForRetrieval || userMessage)) {
              const runtimeId = incomingConversationId || getOrCreateSession().conversationId;
              const pkg = enforceModeBudget(
                temporaryQuizPackage(userQueryForRetrieval || userMessage, err),
                userQueryForRetrieval || userMessage,
                Boolean(correctAfterRepairPayload),
              );
              const payload = jsonResult(pkg, runtimeId);
              send({ t: "done", response: payload });
              streamClosed = true;
              controller.close();
              return;
            }
            send({ t: "error", e: String(err) });
            streamClosed = true;
            controller.close();
            return;
          }

          const runtimeId =
            cozeConversationId || incomingConversationId || getOrCreateSession().conversationId;
          getOrCreateSession(runtimeId);
          addMessage(
            runtimeId,
            "user",
            correctAfterRepairPayload
              ? `[Correct after repair] ${correctAfterRepairPayload.question.slice(0, 80)}`
              : userMessage.slice(0, 500),
          );
          addMessage(runtimeId, "assistant", rawText.slice(0, 400));

          console.log("[tutor] coze raw (first 1200):", rawText.slice(0, 1200));
          const pkg = enforceModeBudget(
            ensureGradableQuizPackage(
              normalizeCozeAgentPackage(rawText),
              userQueryForRetrieval || userMessage,
            ),
            userQueryForRetrieval || userMessage,
            Boolean(correctAfterRepairPayload),
          );
          const mr = pkg.mainResponse;
          console.log(
            "[tutor] parsed pkg mode=%s summary_len=%d def_len=%d int_len=%d ex_len=%d cm_len=%d quiz=%s weak=%s next=%s resources=%d",
            pkg.mode, mr.summary.length,
            mr.definition?.length ?? 0, mr.intuition?.length ?? 0,
            mr.example?.length ?? 0, mr.commonMistake?.length ?? 0,
            pkg.quiz ? "yes" : "no",
            typeof pkg.weakTopic === "string" ? pkg.weakTopic.slice(0, 30) : JSON.stringify(pkg.weakTopic),
            pkg.nextRecommendation.slice(0, 40),
            pkg.resources.length,
          );
          const payload = jsonResult(pkg, runtimeId);
          await updateLearnerMemoryFromPackage({
            sessionId: persistentSessionId,
            userMessage: userQueryForRetrieval || userMessage,
            pkg,
          });
          clearInterval(heartbeat);
          send({ t: "done", response: payload });
          streamClosed = true;
          controller.close();
        },
        cancel() {
          // The request was closed by the browser or platform while Coze was still running.
          // The async work cannot be aborted here, but this prevents further enqueue attempts.
          streamClosed = true;
          if (heartbeat) clearInterval(heartbeat);
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const cozeResult = await callTutorModel(
      messages,
      incomingConversationId,
      hasImage ? imageFile : null,
      documentFileForCoze,
      clientSessionId,
    );
    const rawText = cozeResult.text;
    const runtimeId =
      cozeResult.conversationId || incomingConversationId || getOrCreateSession().conversationId;
    getOrCreateSession(runtimeId);

    addMessage(
      runtimeId,
      "user",
      correctAfterRepairPayload
        ? `[Correct after repair] ${correctAfterRepairPayload.question.slice(0, 80)}`
        : userMessage.slice(0, 500),
    );
    addMessage(runtimeId, "assistant", rawText.slice(0, 400));

    console.log("[tutor] coze raw (first 1200):", rawText.slice(0, 1200));
    const pkg = enforceModeBudget(
      ensureGradableQuizPackage(
        normalizeCozeAgentPackage(rawText),
        userQueryForRetrieval || userMessage,
      ),
      userQueryForRetrieval || userMessage,
      Boolean(correctAfterRepairPayload),
    );
    const mr2 = pkg.mainResponse;
    console.log(
      "[tutor] parsed pkg mode=%s summary_len=%d def_len=%d int_len=%d ex_len=%d cm_len=%d quiz=%s weak=%s next=%s resources=%d",
      pkg.mode, mr2.summary.length,
      mr2.definition?.length ?? 0, mr2.intuition?.length ?? 0,
      mr2.example?.length ?? 0, mr2.commonMistake?.length ?? 0,
      pkg.quiz ? "yes" : "no",
      typeof pkg.weakTopic === "string" ? pkg.weakTopic.slice(0, 30) : JSON.stringify(pkg.weakTopic),
      pkg.nextRecommendation.slice(0, 40),
      pkg.resources.length,
    );
    const payload = jsonResult(pkg, runtimeId);
    await updateLearnerMemoryFromPackage({
      sessionId: persistentSessionId,
      userMessage: userQueryForRetrieval || userMessage,
      pkg,
    });

    return NextResponse.json(payload);
  } catch (err) {
    console.error("Tutor model request failed", err);
    const fid = incomingConversationId || getOrCreateSession().conversationId;
    const fallbackPkg = enforceModeBudget(
      isQuizRequest(userQueryForRetrieval || userMessage)
        ? temporaryQuizPackage(userQueryForRetrieval || userMessage, err)
        : {
            ...EMPTY_COZE_PACKAGE,
            mainResponse: {
              summary: `Coze request failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          },
      userQueryForRetrieval || userMessage,
      Boolean(correctAfterRepairPayload),
    );
    return NextResponse.json(jsonResult(fallbackPkg, fid));
  }
}
