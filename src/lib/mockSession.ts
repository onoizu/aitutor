import type { TutorSessionModel } from "@/lib/types";

export const mockSession: TutorSessionModel = {
  id: "demo-session-01",
  topic: "Binary Search Trees (BST) — search & insert",
  mode: "teach",
  learnerState: "needs_example",
  weakTopics: ["invariant reasoning", "edge cases (null/leaf)", "time complexity"],
  nextRecommendation: "Try 3 insert operations, then a 1‑minute quiz.",
  messages: [
    {
      id: "m1",
      role: "student",
      content:
        "I keep mixing up why BST search is O(h). Can you explain it like I’m debugging code?",
      createdAtIso: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    },
    {
      id: "m2",
      role: "tutor",
      content:
        "Absolutely. Think of every comparison as choosing exactly one branch (left or right). You never explore both. So the number of steps is the number of nodes on the path you follow — the tree height h.",
      createdAtIso: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    },
    {
      id: "m3",
      role: "student",
      content: "Can you give me an example with numbers?",
      createdAtIso: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    },
    {
      id: "m4",
      role: "tutor",
      content:
        "Sure. If your root is 8 and you search for 3: compare with 8 → go left (since 3 < 8), compare with 4 → go left, compare with 2 → go right, compare with 3 → found. That’s one path; no backtracking.",
      createdAtIso: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
  ],
  cards: [
    {
      kind: "explanation",
      title: "BST intuition (what your code is really doing)",
      bullets: [
        "BST invariant: left subtree < node < right subtree.",
        "Each comparison eliminates half the remaining possibilities (one entire subtree).",
        "Runtime depends on height h: balanced \(h \\approx \\log_2 n\), skewed \(h \\approx n\).",
      ],
      keyTakeaway:
        "BST search touches one node per level → time is O(h), not O(n) unless the tree is skewed.",
    },
    {
      kind: "quiz",
      title: "Quick check (1 question)",
      question:
        "You search for a value in a BST and only compare with nodes along a single root-to-leaf path. What is the time complexity in terms of tree height h?",
      choices: [
        {
          id: "a",
          label: "O(n) always",
          explanation:
            "Not always—BST search doesn’t scan all nodes unless the tree is extremely skewed.",
        },
        {
          id: "b",
          label: "O(h)",
          explanation:
            "Correct: you do one comparison per level along the path you follow.",
        },
        {
          id: "c",
          label: "O(log n) always",
          explanation:
            "Only when the tree is balanced; in general it’s O(h).",
        },
        {
          id: "d",
          label: "O(1)",
          explanation: "You still need comparisons to move down the tree.",
        },
      ],
      correctChoiceId: "b",
    },
    {
      kind: "repair",
      title: "Answer repair (when you’re close but off)",
      misconception:
        "If you answered O(log n) always: you assumed the tree is balanced by default.",
      hintSteps: [
        "What does h represent? (height = longest root-to-leaf path)",
        "How many nodes can you visit if the BST is a linked list?",
        "Now relate runtime to h, and only then to n for balanced trees.",
      ],
      fixedAnswer:
        "BST search is O(h). If the BST is balanced, \(h=O(\\log n)\). If skewed, \(h=O(n)\).",
    },
    {
      kind: "summary",
      title: "Session summary (auto-generated)",
      whatYouLearned: [
        "Why search follows one branch per comparison",
        "Why runtime depends on height h",
        "When O(log n) applies (balanced BSTs)",
      ],
      weakTopics: ["invariant reasoning", "edge cases (null/leaf)"],
      nextRecommendation:
        "Do an insert trace on paper: insert 8, 4, 10, 2, 6, 9, 12; then re-run the quiz.",
    },
  ],
};

