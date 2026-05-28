import type { CozeAgentPackage } from "@/types/agentPackage";
import type { TutorResponse } from "@/types/tutor";
import {
  teachModeExample,
  quizModeExample,
  repairModeExample,
  reviewModeExample,
} from "@/data/mockTutorData";

/** Options for sending a message to the tutor (e.g. Coze session id, image, document). */
export interface SendMessageOptions {
  sessionId?: string;
  image?: File;
  document?: File;
  conversationId?: string;
  /** AbortSignal to cancel the request */
  signal?: AbortSignal;
  /** When student gets correct after repair: request summary + weak topic + next rec */
  correctAfterRepair?: {
    question: string;
    wrongAnswer: string;
    correctAnswer: string;
    explanation: string;
  };
}

export interface SendMessageResult extends TutorResponse {
  _conversationId?: string;
  /** Coze 按约定 JSON 解析后的结构化包（与 Bot 系统提示词一致） */
  cozePackage?: CozeAgentPackage;
}

async function consumeStreamResponse(
  res: Response,
  signal?: AbortSignal
): Promise<SendMessageResult> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.slice(6)) as { t: string; response?: SendMessageResult; e?: string };
            if (parsed.t === "done" && parsed.response) return parsed.response;
            if (parsed.t === "error") throw new Error(parsed.e ?? "Stream error");
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  throw new Error("Stream ended without done event");
}

/**
 * Sends a user message to the tutor and returns the structured tutor response.
 * In production this calls our Next.js API route, which proxies to Coze.
 * If anything fails, we gracefully fall back to local mock responses.
 *
 * @param userMessage - The student's message or question
 * @param options - Optional settings (e.g. sessionId, image file)
 * @returns Promise resolving to the tutor's structured response
 */
export async function sendMessage(
  userMessage: string,
  options?: SendMessageOptions
): Promise<SendMessageResult> {
  try {
    let res: Response;
    const hasFiles = options?.image || options?.document;
    if (hasFiles) {
      const formData = new FormData();
      formData.append("message", userMessage);
      if (options.sessionId) formData.append("sessionId", options.sessionId);
      if (options.conversationId) formData.append("conversationId", options.conversationId);
      if (options.image) formData.append("image", options.image);
      if (options.document) formData.append("document", options.document);
      res = await fetch("/api/tutor", {
        method: "POST",
        body: formData,
        signal: options?.signal,
      });
    } else {
      const useStream = !options?.correctAfterRepair;
      const url = `/api/tutor${useStream ? "?stream=1" : ""}`;
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          sessionId: options?.sessionId,
          conversationId: options?.conversationId,
          correctAfterRepair: options?.correctAfterRepair,
        }),
        signal: options?.signal,
      });
    }

    if (!res.ok) {
      console.warn("Falling back to mock tutor due to API error");
      return mockFetchTutorResponse(userMessage, { sessionId: options?.sessionId });
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      return consumeStreamResponse(res, options?.signal);
    }

    const data = (await res.json()) as SendMessageResult;
    return data;
  } catch (err) {
    console.error("Tutor API call failed, using mock response", err);
    return mockFetchTutorResponse(userMessage, options);
  }
}


/**
 * Mock implementation: simulates sending a message and receiving a TutorResponse.
 * Replace this with Coze API integration; keep the return type as TutorResponse.
 */
async function mockFetchTutorResponse(
  userMessage: string,
  _options?: SendMessageOptions
): Promise<TutorResponse> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));

  const normalized = userMessage.toLowerCase().trim();

  // Simple keyword-based mock routing for demo; real Coze will replace this.
  if (normalized.includes("quiz") || normalized.includes("quick check")) {
    return { ...quizModeExample };
  }
  if (
    normalized.includes("repair") ||
    normalized.includes("wrong") ||
    normalized.includes("fix")
  ) {
    return { ...repairModeExample };
  }
  if (
    normalized.includes("summary") ||
    normalized.includes("review") ||
    normalized.includes("recap")
  ) {
    return { ...reviewModeExample };
  }

  // Default: teach / explanation
  return { ...teachModeExample };
}
