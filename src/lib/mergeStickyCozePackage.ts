import type { CozeAgentPackage } from "@/types/agentPackage";

/**
 * Keep this function as the single handoff point for Coze package merging.
 * Study Studio fields intentionally follow the latest package exactly, so old
 * weak topics, summaries, or resources never remain visible after a new turn.
 */
export function mergeStickyCozeFields(
  next: CozeAgentPackage,
): CozeAgentPackage {
  return next;
}
