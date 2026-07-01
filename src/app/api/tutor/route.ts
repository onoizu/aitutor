import { NextResponse } from "next/server";
import type { TutorResponse } from "@/types/tutor";
import { cozeChatCompletion } from "@/lib/cozeClient";
import { addMessage, getOrCreateSession } from "@/lib/tutorSession";
import { extractTextFromFile } from "@/lib/documentParser";
import { chatCompletion, type ChatMessage } from "@/lib/modelClient";
import { normalizeCozeAgentPackage, EMPTY_COZE_PACKAGE } from "@/lib/normalizeAgentPackage";
import { cozePackageToTutorResponse } from "@/lib/cozePackageAdapter";
import { formatCourseContext, ingestCourseDocument, retrieveCourseContext } from "@/lib/ragStore";
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
    `Update mainResponse.summary, noteEntry, sessionSummary, nextRecommendation, weakTopic, resources, mode, learningState as appropriate.`
  );
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

async function callTutorModel(
  messages: ChatMessage[],
  conversationId: string | undefined,
  imageFile: File | null,
  clientSessionId: string | undefined,
): Promise<{ text: string; conversationId: string; provider: "coze" | "custom" }> {
  try {
    const result = await cozeChatCompletion(
      messages,
      conversationId,
      imageFile,
      clientSessionId,
    );
    return { ...result, provider: "coze" };
  } catch (cozeErr) {
    console.error("Coze API request failed; trying custom model fallback", cozeErr);
    const text = await chatCompletion(messages);
    return {
      text,
      conversationId: conversationId || clientSessionId || getOrCreateSession().conversationId,
      provider: "custom",
    };
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
  let userQueryForRetrieval = "";

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    userMessage = (formData.get("message") as string)?.trim() ?? "";
    incomingConversationId =
      (formData.get("conversationId") as string) || undefined;
    clientSessionId =
      (formData.get("sessionId") as string)?.trim() || undefined;
    imageFile = (formData.get("image") as File | null) ?? null;

    const documentFile = formData.get("document") as File | null;
    if (documentFile?.size && documentFile.size > 0) {
      console.log(
        "[tutor/route] document upload: name=%s size=%d type=%s",
        documentFile.name, documentFile.size, documentFile.type,
      );
      const docText = await extractTextFromFile(documentFile);
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
        userMessage = `[Document "${documentFile.name}" content below]\n\n${docText}\n\n[User question] ${prompt}`;
      } else {
        console.warn("[tutor/route] document extraction returned empty for:", documentFile.name);
        userMessage =
          `[The user uploaded a document "${documentFile.name}" (${(documentFile.size / 1024).toFixed(1)} KB) ` +
          `but its content could not be extracted. ` +
          `Please acknowledge the upload and explain that the file format may not be supported or the file may be empty.]\n\n` +
          `[User question] ${prompt}`;
      }
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

  let messages: ChatMessage[];
  if (correctAfterRepairPayload) {
    messages = [
      {
        role: "user",
        content:
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
        content: persistentContext
          ? `${persistentContext}\n\n[Current user request]\n${text}`
          : text,
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
              clientSessionId,
            );
            rawText = result.text;
            cozeConversationId = result.conversationId;
          } catch (err) {
            console.error("[tutor] stream failed", err);
            clearInterval(heartbeat);
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
          const pkg = normalizeCozeAgentPackage(rawText);
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
    const pkg = normalizeCozeAgentPackage(rawText);
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
    const fallbackPkg = {
      ...EMPTY_COZE_PACKAGE,
      mainResponse: {
        summary: `Coze request failed: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
    const fid = incomingConversationId || getOrCreateSession().conversationId;
    return NextResponse.json(jsonResult(fallbackPkg, fid));
  }
}
