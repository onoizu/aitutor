import type { TutorResponse, TutorMessage } from "@/types/tutor";

// Use a fixed timestamp so server/client renders stay perfectly in sync
// and the demo remains deterministic across builds.
const DEMO_TIMESTAMP = "2024-01-01T00:00:00.000Z";

const baseTranscript: TutorMessage[] = [
  {
    role: "student",
    text: "I don't really get why BST search is O(log n).",
    timestampIso: DEMO_TIMESTAMP,
  },
  {
    role: "tutor",
    text: "Let’s walk through the invariant and an example tree.",
    timestampIso: DEMO_TIMESTAMP,
  },
];

export const teachModeExample: TutorResponse = {
  intent: "explain_concept",
  learningState: "needs_example",
  mode: "teach",
  content: {
    contentType: "explanation",
    definition:
      "A binary search tree (BST) is a binary tree where every node’s left subtree only contains values smaller than the node and the right subtree only contains values larger.",
    intuition:
      "Think of a sorted decision tree: each comparison throws away half of the remaining search space, similar to binary search on an array.",
    example:
      "For the keys [2, 4, 6, 8, 10], a balanced BST might have 6 as the root, 4 and 8 as children, and 2, 10 as leaves. To find 10, you compare with 6 → go right, compare with 8 → go right, compare with 10 → found.",
    commonMistake:
      "Assuming any tree with numbers is a BST. The ordering invariant must hold on every subtree, not just the root.",
  },
  message:
    "Clarified the BST definition and gave a concrete search example to reduce conceptual confusion.",
  weakTopic: {
    id: "bst-invariant",
    label: "BST invariant reasoning",
  },
  nextRecommendation: {
    id: "work-through-trace",
    title: "Trace one more BST search by hand.",
    detail:
      "Draw a small BST, pick a key, and explicitly write the comparisons and branches taken at each step.",
  },
  sessionSummary: {
    coveredTopics: ["BST definition", "BST invariant", "Search path example"],
    weakPoints: ["Recognizing when the invariant is broken"],
    recommendation: {
      id: "move-to-quiz",
      title: "Move to a short quiz once the example feels clear.",
      detail:
        "Verify that you can identify whether a given tree satisfies the BST invariant before taking a quiz.",
    },
  },
  transcript: baseTranscript,
  currentLearningGoals: [
    "Understand BST definition",
    "Identify BST invariant",
    "Trace search complexity",
  ],
  recommendedResources: [
    {
      type: "video",
      title: "BST Search Explained",
      source: "YouTube",
      reason: "Good visual explanation of BST search complexity",
      url: "https://example.com/video",
      thumbnail: "https://example.com/thumb.jpg",
    },
    {
      type: "article",
      title: "BST Invariant Notes",
      source: "Course Notes",
      reason: "Useful for understanding the BST ordering rule",
      url: "https://example.com/article",
    },
  ],
};

export const quizModeExample: TutorResponse = {
  intent: "ask_question",
  learningState: "ready_for_quiz",
  mode: "quiz",
  content: {
    contentType: "quiz",
    question:
      "In a balanced BST with n nodes, what is the worst-case time complexity for a successful search?",
    type: "single_choice",
    options: [
      { id: "a", text: "O(1)" },
      { id: "b", text: "O(log n)" },
      { id: "c", text: "O(n)" },
      { id: "d", text: "O(n log n)" },
    ],
    correctAnswer: "b",
    explanation:
      "In a balanced BST, the height of the tree is O(log n). A search traverses at most one node per level, so the worst-case number of comparisons is proportional to the height.",
  },
  message:
    "Presented a single-choice question to check if the learner connects search cost to tree height.",
  weakTopic: null,
  nextRecommendation: {
    id: "review-if-wrong",
    title: "If you answer incorrectly, jump to Repair Mode.",
    detail:
      "We’ll revisit the relationship between height, balance, and complexity.",
  },
  sessionSummary: {
    coveredTopics: ["Search complexity", "Height in balanced trees"],
    weakPoints: [],
    recommendation: {
      id: "2-question-quiz",
      title: "Extend to a 2-question follow-up quiz.",
    },
  },
  transcript: baseTranscript,
};

export const repairModeExample: TutorResponse = {
  intent: "repair_misconception",
  learningState: "wrong_but_fixable",
  mode: "repair",
  content: {
    contentType: "repair",
    feedback:
      "You selected O(n), which would be correct for an extremely skewed tree, but the question specified a balanced BST.",
    hint:
      "Ask yourself: how many levels does a balanced tree with n nodes have? That number of levels is the maximum number of comparisons.",
    nextStep:
      "Re-try the question with ‘height of a balanced tree’ in mind. If still unsure, sketch a small balanced BST and count its levels.",
  },
  message:
    "Gave targeted feedback that contrasts skewed vs. balanced trees and nudges the learner to reason via height.",
  weakTopic: {
    id: "height-vs-n",
    label: "Height vs. number of nodes",
  },
  nextRecommendation: {
    id: "draw-tree",
    title: "Draw a 15-node balanced BST and count its height.",
  },
  sessionSummary: {
    coveredTopics: ["Balanced vs. skewed trees", "Height interpretation"],
    weakPoints: ["Mapping from structure to complexity"],
    recommendation: {
      id: "mini-exercise",
      title: "Do a mini-exercise: compare heights for 7, 15, and 31-node trees.",
    },
  },
  transcript: baseTranscript,
};

export const reviewModeExample: TutorResponse = {
  intent: "review_session",
  learningState: "ready_for_quiz",
  mode: "review",
  content: {
    contentType: "summary",
    coveredTopics: [
      "BST definition and invariant",
      "Search path as a root-to-leaf walk",
      "Time complexity via tree height",
    ],
    weakPoints: ["Spotting violations of the BST invariant"],
    recommendation: {
      id: "next-unit",
      title: "Move to insert/delete operations in BSTs.",
      detail:
        "Start with how insert preserves the invariant, then reason about balancing strategies next.",
    },
  },
  message:
    "Summarized what was covered in this mini-session and proposed the next micro-unit.",
  weakTopic: {
    id: "invariant-violations",
    label: "Detecting invariant violations",
  },
  nextRecommendation: {
    id: "next-module-bst-update",
    title: "Advance to ‘BST insert & delete’ with a short recap quiz first.",
  },
  sessionSummary: {
    coveredTopics: [
      "BST basics",
      "Height-based complexity",
      "Balanced vs. skewed trees",
    ],
    weakPoints: ["Rigidly checking the invariant in arbitrary trees"],
    recommendation: {
      id: "spiral-review",
      title:
        "Spiral back to BST search after learning insert/delete to reinforce the invariant.",
    },
  },
  transcript: baseTranscript,
};

export const mindmapModeExample: TutorResponse = {
  intent: "review_session",
  learningState: "ready_for_quiz",
  mode: "mindmap",
  content: {
    contentType: "mindmap",
    mermaidCode: `mindmap
  root((BST Study Summary))
    Definition
      Binary Search Tree
      Left smaller Right larger
    Complexity
      Balanced O(log n)
      Skewed O(n)
    Key Points
      Height determines search cost
      Balance matters`,
    title: "BST Study Mind Map",
  },
  message: "Here is a mind map to help you review what you've learned.",
  weakTopic: null,
  nextRecommendation: null,
  sessionSummary: null,
};

// Optional convenience export if you want to iterate across all modes in the UI.
export const allTutorMocks = {
  teach: teachModeExample,
  quiz: quizModeExample,
  repair: repairModeExample,
  review: reviewModeExample,
  mindmap: mindmapModeExample,
};

