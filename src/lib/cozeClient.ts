import {
  COZE_API_BASE,
  cozeChatUrl,
  cozeRetrieveUrl,
  cozeFilesUploadUrl,
  cozeMessageListUrl,
} from "@/lib/coze";
import { parseCozeResponseJson } from "@/lib/coze/parseResponseJson";
import type { ChatMessage } from "@/lib/modelClient";

interface CozeConfig {
  token: string;
  botId: string;
}

interface CozeChatResult {
  text: string;
  conversationId: string;
}

function getConfig(): CozeConfig {
  return {
    token: process.env.COZE_API_TOKEN ?? "",
    botId:
      (process.env.COZE_BOT_ID ?? process.env.COZE_AGENT_ID ?? "").trim(),
  };
}

function ensureConfig() {
  const { token, botId } = getConfig();
  if (!token || !botId) {
    throw new Error(
      "Missing COZE_API_TOKEN or bot id (set COZE_BOT_ID or COZE_AGENT_ID)",
    );
  }
  const t = token.trim();
  if (/^https?:\/\//i.test(t)) {
    throw new Error(
      "COZE_API_TOKEN must be your PAT (e.g. pat_...), not an OAuth/consent page URL.",
    );
  }
  return { token: t, botId };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildCozeUserPrompt(messages: ChatMessage[]): string {
  return messages
    .map((m) => {
      if (m.role === "system") return `[System Instruction]\n${m.content}`;
      if (m.role === "assistant") return `[Assistant Context]\n${m.content}`;
      return `[User]\n${m.content}`;
    })
    .join("\n\n");
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" ? (value as JsonRecord) : null;
}

function extractChatMeta(data: unknown): { chatId: string; conversationId: string } {
  const obj = asRecord(data);
  const payload = asRecord(obj?.data) ?? obj;
  const conversationId = String(
    payload?.conversation_id ?? payload?.conversationId ?? "",
  );
  const chatId = String(
    payload?.chat_id ?? payload?.id ?? asRecord(payload?.chat)?.id ?? "",
  );
  if (!chatId || !conversationId) {
    throw new Error(
      `Coze chat metadata missing (keys: ${Object.keys(payload ?? {}).join(",")})`,
    );
  }
  return { chatId, conversationId };
}

function extractStatus(data: unknown): string {
  const obj = asRecord(data);
  const payload = asRecord(obj?.data) ?? obj;
  return String(payload?.status ?? "");
}

function extractMessages(data: unknown): JsonRecord[] {
  const obj = asRecord(data);
  if (!obj) return [];

  if (Array.isArray(obj.data)) {
    return obj.data.filter(
      (x): x is JsonRecord =>
        Boolean(x && typeof x === "object" && !Array.isArray(x)),
    );
  }

  const payload = asRecord(obj.data) ?? obj;
  const list =
    payload?.messages ??
    payload?.message_list ??
    payload?.list ??
    (Array.isArray(payload?.data) ? payload.data : undefined);
  if (Array.isArray(list)) {
    return list.filter((x): x is JsonRecord => Boolean(asRecord(x)));
  }
  return [];
}

function contentToPlainText(content: unknown): string {
  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => asRecord(part))
      .map((part) => String(part?.text ?? ""))
      .join("\n")
      .trim();
  }
  const r = asRecord(content);
  if (r && typeof r.text === "string" && r.text.trim()) return r.text.trim();
  return "";
}

/** Types that are intermediate/tool artifacts — never the bot's final answer. */
const SKIP_TYPES = new Set([
  "knowledge_recall",
  "function_call",
  "tool_output",
  "tool_response",
  "verbose",
]);

/**
 * Coze streams the `answer` message into the message list progressively:
 * content starts as `{` and grows until the full JSON object is complete.
 * We must wait until the content looks "finished" before accepting it.
 */
function isAnswerComplete(text: string): boolean {
  const s = text.trim();
  if (s.length < 20) return false;
  if (s.startsWith("{")) {
    try { JSON.parse(s); return true; } catch { return false; }
  }
  return s.length > 50;
}

function extractAssistantText(messages: JsonRecord[]): string {
  // 1st pass: only "answer" type — this is the Coze bot's final reply
  for (const msg of [...messages].reverse()) {
    const type = String(msg.type ?? "").toLowerCase();
    if (type === "answer") {
      const t = contentToPlainText(msg.content);
      if (t && isAnswerComplete(t)) return t;
    }
  }

  // 2nd pass: follow_up is only useful if no answer exists at all
  const hasAnswer = messages.some(
    (m) => String(m.type ?? "").toLowerCase() === "answer",
  );
  if (!hasAnswer) {
    for (const msg of [...messages].reverse()) {
      const type = String(msg.type ?? "").toLowerCase();
      if (type === "follow_up") {
        const t = contentToPlainText(msg.content);
        if (t && t.length > 20) return t;
      }
    }
  }

  return "";
}

function assertCozeEnvelopeOk(data: unknown): void {
  const o = asRecord(data);
  if (!o || !("code" in o)) return;
  const c = o.code;
  if (typeof c === "number" && c !== 0) {
    throw new Error(
      `Coze API error ${c}: ${String(o.msg ?? o.message ?? o.detail ?? "")}`,
    );
  }
}

async function cozePost<T = unknown>(url: string, body: JsonRecord): Promise<T> {
  const { token } = ensureConfig();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Coze request failed ${res.status}: ${text.slice(0, 200)}`);
  }
  try {
    const parsed = parseCozeResponseJson(text) as T;
    assertCozeEnvelopeOk(parsed);
    return parsed;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Coze API error")) throw e;
    if (e instanceof SyntaxError) throw new Error("Coze returned non-JSON response");
    throw e;
  }
}

async function cozeGetJson<T = unknown>(url: string): Promise<T> {
  const { token } = ensureConfig();
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Coze GET failed ${res.status}: ${text.slice(0, 200)}`);
  }
  try {
    const parsed = parseCozeResponseJson(text) as T;
    assertCozeEnvelopeOk(parsed);
    return parsed;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Coze API error")) throw e;
    if (e instanceof SyntaxError) throw new Error("Coze returned non-JSON response");
    throw e;
  }
}

async function fetchChatMessageListPayload(
  conversationId: string,
  chatId: string,
): Promise<unknown> {
  const q = new URLSearchParams({
    conversation_id: conversationId,
    chat_id: chatId,
  });
  const getUrl = `${cozeMessageListUrl}?${q.toString()}`;
  try {
    return await cozeGetJson(getUrl);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Coze API error")) throw e;
    return cozePost(cozeMessageListUrl, {
      conversation_id: conversationId,
      chat_id: chatId,
    });
  }
}

export async function uploadCozeFile(file: File): Promise<string> {
  const { token } = ensureConfig();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(cozeFilesUploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Coze file upload failed ${res.status}: ${text.slice(0, 200)}`);
  }
  let parsed: unknown;
  try {
    parsed = parseCozeResponseJson(text);
  } catch {
    throw new Error("Coze upload returned non-JSON");
  }
  const obj = asRecord(parsed);
  const data = asRecord(obj?.data) ?? obj;
  const id = data?.id ?? obj?.id;
  if (!id) throw new Error("Coze upload response missing file id");
  return String(id);
}

function isCozeInvalidChatError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /\b4001\b/.test(msg) ||
    /Invalid chat|chat cannot be found|wrong chat id/i.test(msg)
  );
}

async function cozeChatCompletionOnce(
  messages: ChatMessage[],
  conversationId: string | undefined,
  imageFile: File | null | undefined,
  documentFile: File | null | undefined,
  cozeUserId: string,
): Promise<CozeChatResult> {
  const { botId } = ensureConfig();
  const userPrompt = buildCozeUserPrompt(messages);

  let imageFileId: string | undefined;
  if (imageFile && imageFile.size > 0) {
    imageFileId = await uploadCozeFile(imageFile);
  }

  let documentFileId: string | undefined;
  if (documentFile && documentFile.size > 0) {
    documentFileId = await uploadCozeFile(documentFile);
  }

  const multimodalParts = [
    { type: "text", text: userPrompt },
    ...(imageFileId ? [{ type: "image", file_id: imageFileId }] : []),
    ...(documentFileId ? [{ type: "file", file_id: documentFileId }] : []),
  ];

  const additional_messages = imageFileId || documentFileId
    ? [
        {
          role: "user",
          type: "question",
          content: JSON.stringify(multimodalParts),
          content_type: "object_string",
        },
      ]
    : [
        {
          role: "user",
          type: "question",
          content: userPrompt,
          content_type: "text",
        },
      ];

  console.log(
    "[coze] POST /v3/chat  bot_id=%s  user_id=%s  conv=%s",
    botId.slice(0, 12) + "…",
    cozeUserId,
    conversationId?.slice(0, 16) ?? "(new)",
  );

  const chatRes = await cozePost(cozeChatUrl, {
    bot_id: botId,
    user_id: cozeUserId,
    stream: false,
    auto_save_history: true,
    ...(conversationId ? { conversation_id: conversationId } : {}),
    additional_messages,
  });

  const { chatId, conversationId: cozeConversationId } = extractChatMeta(chatRes);
  console.log(
    "[coze] chat created  chatId=%s  convId=%s  status=%s",
    chatId.slice(0, 16),
    cozeConversationId.slice(0, 16),
    extractStatus(chatRes),
  );

  const MAX_POLLS = process.env.NETLIFY
    ? envNumber("COZE_MAX_POLLS_NETLIFY", 16)
    : envNumber("COZE_MAX_POLLS", 60);
  const FIRST_POLL_DELAY = envNumber("COZE_FIRST_POLL_DELAY_MS", 600);
  const POLL_INTERVAL = envNumber("COZE_POLL_INTERVAL_MS", 900);
  let pollCount = 0;
  let msgs: JsonRecord[] = [];
  let text = "";
  let retrieveAvailable = true;
  let lastTextSnapshot = "";
  let stableRounds = 0;

  while (pollCount < MAX_POLLS) {
    await sleep(pollCount === 0 ? FIRST_POLL_DELAY : POLL_INTERVAL);
    pollCount += 1;

    let chatCompleted = false;

    if (retrieveAvailable) {
      try {
        const q = new URLSearchParams({
          conversation_id: cozeConversationId,
          chat_id: chatId,
        });
        const retrieveRes = await cozeGetJson(`${cozeRetrieveUrl}?${q.toString()}`);
        const status = extractStatus(retrieveRes);
        console.log("[coze] poll %d — retrieve status=%s", pollCount, status);
        if (status === "failed") {
          let failedDetail = "";
          try {
            const messageRes = await fetchChatMessageListPayload(
              cozeConversationId,
              chatId,
            );
            failedDetail = JSON.stringify(messageRes).slice(0, 500);
          } catch (messageErr) {
            failedDetail = messageErr instanceof Error ? messageErr.message : String(messageErr);
          }
          throw new Error(`Coze chat failed (status=failed): ${failedDetail}`);
        }
        chatCompleted = status === "completed";
        if (!chatCompleted) continue;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/4001|retrieve|chat cannot be found/i.test(msg) || /non-JSON/i.test(msg)) {
          console.warn("[coze] retrieve unavailable, falling back to message-list polling");
          retrieveAvailable = false;
        } else if (msg.startsWith("Coze chat failed (status=failed)")) {
          throw e;
        } else {
          console.warn("[coze] retrieve error (poll %d):", pollCount, e);
        }
      }
    }

    try {
      const messageRes = await fetchChatMessageListPayload(
        cozeConversationId,
        chatId,
      );
      msgs = extractMessages(messageRes);
      console.log(
        "[coze] poll %d — %d msgs: %s",
        pollCount,
        msgs.length,
        msgs.map((m) => `${String(m.role ?? "?")}/${String(m.type ?? "?")}`).join(", "),
      );
      text = extractAssistantText(msgs);

      if (chatCompleted && text) break;

      if (!retrieveAvailable && text) {
        if (text === lastTextSnapshot) {
          stableRounds += 1;
          if (stableRounds >= 2) break;
        } else {
          stableRounds = 0;
          lastTextSnapshot = text;
        }
      }
    } catch (e) {
      console.warn("[coze] message list poll %d failed:", pollCount, e);
    }
  }

  console.log(
    "[coze] polling done  polls=%d  msgs=%d  text_len=%d  retrieve=%s",
    pollCount, msgs.length, text.length, retrieveAvailable ? "used" : "fallback",
  );

  if (!text) {
    const preview = msgs
      .slice(-3)
      .map((m) => `${String(m.role ?? "?")}/${String(m.type ?? "?")}`)
      .join(", ");
    throw new Error(
      `Coze returned empty assistant message (messages=${msgs.length} tail=${preview || "none"} polls=${pollCount})`,
    );
  }

  console.log("[coze] success  text_len=%d  convId=%s", text.length, cozeConversationId.slice(0, 16));
  return { text, conversationId: cozeConversationId };
}

export async function cozeChatCompletion(
  messages: ChatMessage[],
  conversationId?: string,
  imageFile?: File | null,
  documentFile?: File | null,
  endUserKey?: string,
): Promise<CozeChatResult> {
  const cozeUserId =
    endUserKey && endUserKey.trim().length > 0
      ? `aitutor-${endUserKey.replace(/[^\w.-]/g, "_").slice(0, 96)}`
      : `aitutor-anon-${Date.now()}`;

  const run = (conv?: string) =>
    cozeChatCompletionOnce(messages, conv, imageFile ?? null, documentFile ?? null, cozeUserId);

  try {
    return await run(conversationId);
  } catch (e) {
    if (isCozeInvalidChatError(e)) {
      if (conversationId) {
        console.warn(
          "[coze] 4001 with conversation_id — retrying without it. conv=%s",
          conversationId.slice(0, 32),
        );
        return await run(undefined);
      }
      console.error(
        "[coze] 4001 without conversation_id — likely invalid bot_id or token scope.\n" +
          "  bot_id=%s  api_base=%s  user=%s",
        getConfig().botId,
        COZE_API_BASE,
        cozeUserId,
      );
    }
    throw e;
  }
}

export function getCozeConnectionDiagnostics(): {
  hasToken: boolean;
  hasBotId: boolean;
  apiBaseHost: string;
} {
  const hasToken = Boolean((process.env.COZE_API_TOKEN ?? "").trim());
  const hasBotId = Boolean(
    (process.env.COZE_BOT_ID ?? process.env.COZE_AGENT_ID ?? "").trim(),
  );
  let apiBaseHost = "";
  try {
    apiBaseHost = new URL(COZE_API_BASE).host;
  } catch {
    apiBaseHost = COZE_API_BASE.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  }
  return { hasToken, hasBotId, apiBaseHost };
}

export function buildCozeStatusHints(
  diag: ReturnType<typeof getCozeConnectionDiagnostics>,
  reachabilityOk: boolean,
): string[] {
  const hints: string[] = [];
  if (!diag.hasToken) {
    hints.push("Set COZE_API_TOKEN in .env.local, then restart `npm run dev`.");
  }
  if (!diag.hasBotId) {
    hints.push("Set COZE_BOT_ID or COZE_AGENT_ID to your numeric bot id.");
  }
  if (diag.hasToken && diag.hasBotId && !reachabilityOk) {
    if (diag.apiBaseHost.includes("coze.cn")) {
      hints.push(
        "API host is coze.cn — if your PAT is from coze.com, set COZE_API_BASE_URL=https://api.coze.com",
      );
    } else {
      hints.push(
        "Confirm bot id belongs to this account; PAT needs Bot chat / relevant scopes.",
      );
    }
  }
  return hints;
}

export async function checkCozeStatus(): Promise<{ ok: boolean; message: string }> {
  try {
    const { token, botId } = ensureConfig();
    // Lightweight check: POST /v3/chat to see if we can reach the API and
    // the bot_id is valid. We don't wait for the full response.
    const res = await fetch(cozeChatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bot_id: botId,
        user_id: "aitutor-health-check",
        stream: false,
        auto_save_history: true,
        additional_messages: [
          { role: "user", type: "question", content: "ping", content_type: "text" },
        ],
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, message: `Coze API ${res.status}: ${text.slice(0, 80)}` };
    }
    const parsed = parseCozeResponseJson(text);
    const obj = asRecord(parsed);
    const code = obj?.code;
    if (typeof code === "number" && code !== 0) {
      return {
        ok: false,
        message: `Coze error ${code}: ${String(obj?.msg ?? obj?.message ?? "").slice(0, 80)}`,
      };
    }
    return { ok: true, message: `Connected to Coze (bot ${botId.slice(0, 12)}…)` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Coze unavailable: ${msg}` };
  }
}
