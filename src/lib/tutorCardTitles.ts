import type { TutorMode } from "@/types/tutor";

/** Headers for explanation-style cards, aligned with Teach → Quiz → Repair → Review. */
export function explanationHeaderForMode(mode: TutorMode): {
  title: string;
  subtitle?: string;
} {
  switch (mode) {
    case "review":
      return {
        title: "✓ Review",
        subtitle: "Session recap and guidance.",
      };
    case "mindmap":
      return {
        title: "🗺 Mind map",
        subtitle: "Concept structure from this topic.",
      };
    case "quiz":
      return {
        title: "⚡ Quiz",
        subtitle: "Check your understanding.",
      };
    case "repair":
      return {
        title: "🔧 Repair",
        subtitle: "Clarify and correct misconceptions.",
      };
    default:
      return {
        title: "📖 Teach",
        subtitle: "Overview, intuition, example, and pitfalls.",
      };
  }
}
