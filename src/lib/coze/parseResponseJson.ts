/**
 * Safely parse JSON from Coze API responses.
 * Coze uses 64-bit snowflake IDs that exceed Number.MAX_SAFE_INTEGER,
 * so we convert bare numeric values for known ID fields to strings
 * before JSON.parse to prevent precision loss.
 */
export function parseCozeResponseJson(raw: string): unknown {
  const safe = raw.replace(
    /("(?:id|conversation_id|chat_id|bot_id|file_id)")\s*:\s*(\d{16,})/g,
    '$1: "$2"',
  );
  return JSON.parse(safe);
}
