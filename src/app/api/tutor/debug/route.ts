import { NextResponse } from "next/server";
import { sessionCount } from "@/lib/tutorSession";
import { getCourseKnowledgeStats } from "@/lib/ragStore";
import { getLearnerMemoryStats } from "@/lib/learnerMemoryStore";

/**
 * GET /api/tutor/debug
 * Debug endpoint showing current configuration and session state.
 * Does not expose sensitive data (keys).
 */
export async function GET() {
  const [knowledge, learnerMemory] = await Promise.all([
    getCourseKnowledgeStats(),
    getLearnerMemoryStats(),
  ]);

  return NextResponse.json({
    provider: "coze",
    api_base_url: process.env.COZE_API_BASE_URL ?? "https://api.coze.cn",
    bot_id: process.env.COZE_AGENT_ID ?? "(not set)",
    api_token_set: Boolean(process.env.COZE_API_TOKEN),
    active_sessions: sessionCount(),
    knowledge,
    learner_memory: learnerMemory,
  });
}
