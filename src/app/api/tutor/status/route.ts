import { NextResponse } from "next/server";
import { checkCozeStatus } from "@/lib/cozeClient";

export type TutorStatus = {
  ok: boolean;
  source: string;
  message: string;
};

/**
 * GET /api/tutor/status
 * Check whether the Coze API is configured and reachable.
 */
export async function GET() {
  const result = await checkCozeStatus();

  return NextResponse.json<TutorStatus>({
    ok: result.ok,
    source: result.ok ? "coze" : "unavailable",
    message: result.message,
  });
}
