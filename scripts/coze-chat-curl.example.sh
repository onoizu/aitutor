#!/usr/bin/env bash
# Test Coze Chat API with a correct Authorization header.
#
# Usage:
#   cp scripts/coze-chat-curl.example.sh scripts/coze-chat-curl.sh
#   export COZE_API_TOKEN='pat_...'   # from Coze PAT page, NOT oauth/consent URL
#   export COZE_BOT_ID='1234567890'
#   bash scripts/coze-chat-curl.sh
#
set -euo pipefail

if [[ -z "${COZE_API_TOKEN:-}" ]]; then
  echo "Set COZE_API_TOKEN to your pat_ token (from Coze console)." >&2
  exit 1
fi
if [[ "${COZE_API_TOKEN}" == http* ]]; then
  echo "COZE_API_TOKEN looks like a URL. Use the pat_ string from PAT page, not oauth link." >&2
  exit 1
fi

BOT_ID="${COZE_BOT_ID:-${COZE_AGENT_ID:-}}"
if [[ -z "${BOT_ID}" ]]; then
  echo "Set COZE_BOT_ID or COZE_AGENT_ID to your numeric bot id." >&2
  exit 1
fi

BASE="${COZE_API_BASE_URL:-https://api.coze.com}"
BASE="${BASE%/}"

JSON=$(printf '%s' "{\"bot_id\":\"${BOT_ID}\",\"user_id\":\"shell-test-001\",\"stream\":false,\"auto_save_history\":true,\"additional_messages\":[{\"role\":\"user\",\"content\":\"hello\",\"content_type\":\"text\"}]}")

curl -sS -X POST "${BASE}/v3/chat" \
  -H "Authorization: Bearer ${COZE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${JSON}"

echo
