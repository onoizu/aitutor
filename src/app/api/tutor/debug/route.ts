import { NextResponse } from "next/server";
import { sessionCount } from "@/lib/tutorSession";

/**
 * GET /api/tutor/debug
 * Debug endpoint showing current configuration and session state.
 * Does not expose sensitive data (keys).
 */
export async function GET() {
  return NextResponse.json({
    provider: "coze",
    api_base_url: process.env.COZE_API_BASE_URL ?? "https://api.coze.cn",
    bot_id: process.env.COZE_AGENT_ID ?? "(not set)",
    api_token_set: Boolean(process.env.COZE_API_TOKEN),
    active_sessions: sessionCount(),
  });
}
