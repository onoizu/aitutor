/**
 * Thin wrapper around the DashScope / OpenAI-compatible chat completions API.
 * Reads env vars for configuration. No session or parsing logic.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function getConfig() {
  return {
    apiUrl: process.env.CUSTOM_API_URL ?? "",
    apiKey: process.env.CUSTOM_API_KEY ?? "",
    modelId: process.env.CUSTOM_MODEL_ID ?? "qwen-plus",
  };
}

const API_TIMEOUT_MS = 90_000;

export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const { apiUrl, apiKey, modelId } = getConfig();
  if (!apiUrl || !apiKey) {
    throw new Error("CUSTOM_API_URL or CUSTOM_API_KEY not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  const res = await fetch(`${apiUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      max_tokens: 4096,
      temperature: 0.7,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!res.ok) {
    const errText = await res.text();
    console.error("[modelClient] API error", res.status, errText.slice(0, 300));
    throw new Error(`Qwen API failed: ${res.status}`);
  }

  const data: any = await res.json();
  return (
    data.choices?.[0]?.message?.content ??
    data.output?.text ??
    ""
  );
}

/**
 * Stream chat completion from Qianwen. Yields text chunks.
 * Uses OpenAI-compatible SSE format (stream: true).
 */
export async function* chatCompletionStream(
  messages: ChatMessage[],
  options?: { signal?: AbortSignal }
): AsyncGenerator<string, void, unknown> {
  const { apiUrl, apiKey, modelId } = getConfig();
  if (!apiUrl || !apiKey) {
    throw new Error("CUSTOM_API_URL or CUSTOM_API_KEY not configured");
  }

  const res = await fetch(`${apiUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      max_tokens: 4096,
      temperature: 0.7,
      stream: true,
    }),
    signal: options?.signal,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[modelClient] stream API error", res.status, errText.slice(0, 300));
    throw new Error(`Qwen API failed: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // skip malformed lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function checkStatus(): Promise<{ ok: boolean; message: string }> {
  const { apiUrl, apiKey, modelId } = getConfig();
  if (!apiUrl || !apiKey) {
    return { ok: false, message: "CUSTOM_API_URL or CUSTOM_API_KEY not configured" };
  }
  try {
    const res = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 5,
      }),
    });
    if (res.ok) {
      return { ok: true, message: `Connected to ${modelId} at ${apiUrl}` };
    }
    const errText = await res.text();
    return { ok: false, message: `API returned ${res.status}: ${errText.slice(0, 100)}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `API unreachable: ${msg}` };
  }
}
