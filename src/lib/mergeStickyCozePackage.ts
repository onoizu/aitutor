import type { CozeAgentPackage } from "@/types/agentPackage";

function weakTopicIsEmpty(w: CozeAgentPackage["weakTopic"]): boolean {
  if (w == null || w === "") return true;
  if (typeof w === "string") return !w.trim();
  const label = (w.label ?? "").toString().trim();
  const id = (w.id ?? "").toString().trim();
  return !label && !id;
}

/**
 * When the model omits session-level fields, keep the previous turn’s values
 * so Study Studio (weak topic, session summary, resources) does not flicker empty.
 */
export function mergeStickyCozeFields(
  prev: CozeAgentPackage,
  next: CozeAgentPackage,
): CozeAgentPackage {
  const resources =
    next.resources?.length > 0 ? next.resources : [...(prev.resources ?? [])];

  const sessionSummary = next.sessionSummary?.trim()
    ? next.sessionSummary
    : prev.sessionSummary?.trim()
      ? prev.sessionSummary
      : next.sessionSummary;

  const weakTopic = weakTopicIsEmpty(next.weakTopic) ? prev.weakTopic : next.weakTopic;

  return {
    ...next,
    resources,
    sessionSummary,
    weakTopic,
  };
}
