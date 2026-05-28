/**
 * Coze API 基地址：需与 Token 区域一致
 * - 国内 (coze.cn) Token → https://api.coze.cn
 * - 国际 (coze.com) Token → https://api.coze.com
 * 在 .env.local 中设置 COZE_API_BASE_URL 可覆盖默认（默认使用国内）。
 */
export const COZE_API_BASE =
  process.env.COZE_API_BASE_URL?.replace(/\/$/, "") || "https://api.coze.cn";

export const cozeChatUrl = `${COZE_API_BASE}/v3/chat`;
export const cozeRetrieveUrl = `${COZE_API_BASE}/v3/chat/retrieve`;
export const cozeMessageListUrl = `${COZE_API_BASE}/v3/chat/message/list`;
export const cozeFilesUploadUrl = `${COZE_API_BASE}/v1/files/upload`;
