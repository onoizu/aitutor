/**
 * Mode-specific system prompt builders.
 * Each function returns a ChatMessage[] array ready for modelClient.chatCompletion().
 * Every prompt tells Qwen the exact JSON schema to return so no regex parsing is needed.
 */

import type { ChatMessage } from "./modelClient";
import type { TutorSessionState } from "./tutorSession";

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function sessionContext(session: TutorSessionState): string {
  const parts: string[] = [];
  if (session.currentTopic) parts.push(`Current topic: ${session.currentTopic}`);
  if (session.previousMode) parts.push(`Previous mode: ${session.previousMode}`);
  if (session.coveredTopics.length)
    parts.push(`Topics covered so far: ${session.coveredTopics.join(", ")}`);
  if (session.weakTopics.length)
    parts.push(`Weak topics: ${session.weakTopics.map((w) => w.label).join(", ")}`);
  if (session.recentMessages.length) {
    const last3 = session.recentMessages.slice(-3);
    parts.push(
      "Recent conversation:\n" +
        last3.map((m) => `  ${m.role}: ${m.text.slice(0, 100)}`).join("\n"),
    );
  }
  return parts.length ? parts.join("\n") : "No session context yet.";
}

const JSON_ONLY_INSTRUCTION =
  "\n\nYou MUST respond with ONLY a valid JSON object matching the schema above. " +
  "No markdown fences, no explanation outside the JSON, no trailing text. " +
  "All string values must be properly escaped.";

/* ------------------------------------------------------------------ */
/*  EXPLAIN / TEACH mode                                               */
/* ------------------------------------------------------------------ */

export function buildExplainPrompt(
  session: TutorSessionState,
  userMessage: string,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are an adaptive AI tutor. The student asked a conceptual question. Provide a clear, thorough explanation.

## Session context
${sessionContext(session)}

## Required JSON schema
{
  "intent": "explain_concept",
  "learningState": "<one of: confused_concept | needs_example | ready_for_quiz>",
  "mode": "teach",
  "content": {
    "contentType": "explanation",
    "definition": "<concise definition>",
    "intuition": "<intuitive analogy or mental model>",
    "example": "<concrete example>",
    "commonMistake": "<common misconception to avoid>"
  },
  "message": "<one-line summary of the explanation>",
  "weakTopic": null or { "id": "<slug>", "label": "<topic name>" },
  "nextRecommendation": { "id": "<slug>", "title": "<suggested next step>", "detail": "<why>" } or null,
  "sessionSummary": null
}

If the student seems ready for assessment, set learningState to "ready_for_quiz" and include a nextRecommendation suggesting a quiz.${JSON_ONLY_INSTRUCTION}`,
    },
    { role: "user", content: userMessage },
  ];
}

/* ------------------------------------------------------------------ */
/*  QUIZ mode                                                           */
/* ------------------------------------------------------------------ */

export function buildQuizPrompt(
  session: TutorSessionState,
  userMessage: string,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are an adaptive AI tutor generating quiz questions for the student.

## Session context
${sessionContext(session)}

## Required JSON schema
{
  "intent": "ask_question",
  "learningState": "ready_for_quiz",
  "mode": "quiz",
  "content": {
    "contentType": "quiz",
    "question": "<first question text>",
    "type": "single_choice",
    "options": [
      { "id": "a", "text": "<option A>" },
      { "id": "b", "text": "<option B>" },
      { "id": "c", "text": "<option C>" },
      { "id": "d", "text": "<option D>" }
    ],
    "correctAnswer": "<id of the correct option, e.g. 'b'>",
    "explanation": "<brief explanation of why the answer is correct>"
  },
  "message": "<one-line tutor message introducing the quiz>",
  "weakTopic": null,
  "nextRecommendation": null,
  "sessionSummary": null,
  "quizSession": {
    "questions": [
      {
        "contentType": "quiz",
        "question": "<question 1>",
        "type": "single_choice",
        "options": [{ "id": "a", "text": "..." }, { "id": "b", "text": "..." }, { "id": "c", "text": "..." }, { "id": "d", "text": "..." }],
        "correctAnswer": "<correct id>",
        "explanation": "<explanation>"
      },
      ... more questions ...
    ],
    "currentIndex": 0
  }
}

DEFAULT: Generate 3–5 single-choice questions unless the user explicitly asks for a specific number (e.g. "one question", "just 1 quiz").
Each question must have 4 options (a, b, c, d). Make options plausible. Set content to the first question; quizSession.questions must contain all questions.${JSON_ONLY_INSTRUCTION}`,
    },
    { role: "user", content: userMessage },
  ];
}

/* ------------------------------------------------------------------ */
/*  QUIZ ANSWER EVALUATION                                              */
/* ------------------------------------------------------------------ */

export function buildQuizEvalPrompt(
  session: TutorSessionState,
  userAnswer: string,
): ChatMessage[] {
  const quiz = session.latestQuiz!;
  const optionsText = quiz.options
    .map((o) => `  ${o.id}. ${o.text}`)
    .join("\n");

  return [
    {
      role: "system",
      content: `You are an adaptive AI tutor evaluating a student's quiz answer.

## Original quiz question
${quiz.question}
Options:
${optionsText}
Correct answer: ${quiz.correctAnswer}
Explanation: ${quiz.explanation}

## Student's answer
${userAnswer}

## Instructions
Compare the student's answer to the correct answer (case-insensitive, trim whitespace).
If correct OR essentially correct, return mode "quiz" with a congratulatory message.
If wrong or partially correct, return mode "repair" with hints (never reveal the answer directly).

## JSON schema for CORRECT answer
{
  "intent": "ask_question",
  "learningState": "ready_for_quiz",
  "mode": "quiz",
  "content": {
    "contentType": "quiz",
    "question": "${quiz.question.replace(/"/g, '\\"')}",
    "type": "${quiz.type}",
    "options": ${JSON.stringify(quiz.options)},
    "correctAnswer": ${JSON.stringify(quiz.correctAnswer)},
    "explanation": "<brief congrats + explanation>"
  },
  "message": "<congratulatory message>",
  "weakTopic": null,
  "nextRecommendation": { "id": "next-topic", "title": "Move on to the next topic", "detail": "..." } or null,
  "sessionSummary": null
}

## JSON schema for WRONG answer
{
  "intent": "repair_misconception",
  "learningState": "wrong_but_fixable",
  "mode": "repair",
  "content": {
    "contentType": "repair",
    "feedback": "<what the student got wrong without revealing the answer>",
    "hint": "<guiding hint to help them reconsider>",
    "nextStep": "<what they should try next>"
  },
  "message": "<encouraging message>",
  "weakTopic": { "id": "<slug>", "label": "<topic>" } or null,
  "nextRecommendation": null,
  "sessionSummary": null
}${JSON_ONLY_INSTRUCTION}`,
    },
    { role: "user", content: `My answer: ${userAnswer}` },
  ];
}

/* ------------------------------------------------------------------ */
/*  REPAIR mode                                                         */
/* ------------------------------------------------------------------ */

export function buildRepairPrompt(
  session: TutorSessionState,
  userMessage: string,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are an adaptive AI tutor in repair mode. The student got a quiz question wrong. Give them a DETAILED, step-by-step hint to help them reason through the problem. Do NOT reveal the correct answer.

## Session context
${sessionContext(session)}

## Required JSON schema
{
  "intent": "repair_misconception",
  "learningState": "wrong_but_fixable",
  "mode": "repair",
  "content": {
    "contentType": "repair",
    "feedback": "<what the student got wrong, without revealing the answer>",
    "hint": "<DETAILED hint: 2-4 sentences guiding them step-by-step to reconsider. Be specific and pedagogical.>",
    "nextStep": "<clear instruction: e.g. 'Re-read the options and try again' or 'Think about what X implies'>"
  },
  "message": "<one-line encouraging tutor message>",
  "weakTopic": { "id": "<slug>", "label": "<topic name>" } or null,
  "nextRecommendation": null,
  "sessionSummary": null
}${JSON_ONLY_INSTRUCTION}`,
    },
    { role: "user", content: userMessage },
  ];
}

/* ------------------------------------------------------------------ */
/*  CORRECT AFTER REPAIR (summary when student gets it right)           */
/* ------------------------------------------------------------------ */

export interface CorrectAfterRepairPayload {
  question: string;
  wrongAnswer: string;
  correctAnswer: string;
  explanation: string;
}

export function buildCorrectAfterRepairPrompt(
  session: TutorSessionState,
  payload: CorrectAfterRepairPayload,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `The student initially got a quiz question wrong but has now answered correctly. Provide a brief summary of why they might have made the mistake and update weak topic + next recommendation.

## Session context
${sessionContext(session)}

## Quiz details
Question: ${payload.question}
Student's wrong answer: ${payload.wrongAnswer}
Correct answer: ${payload.correctAnswer}
Explanation: ${payload.explanation}

## Required JSON schema
{
  "intent": "repair_misconception",
  "learningState": "wrong_but_fixable",
  "mode": "teach",
  "content": {
    "contentType": "explanation",
    "definition": "<brief summary of why the student might have made the mistake>",
    "intuition": "",
    "example": "",
    "commonMistake": "<the misconception they likely had>"
  },
  "message": "<one-line summary, e.g. 'You corrected it! Here is why you might have slipped.'>",
  "weakTopic": { "id": "<slug>", "label": "<topic to review>" },
  "nextRecommendation": { "id": "<slug>", "title": "<suggested next step>", "detail": "<why>" },
  "sessionSummary": null
}${JSON_ONLY_INSTRUCTION}`,
    },
    { role: "user", content: "I got it correct now. Summarize why I might have made the mistake." },
  ];
}

/* ------------------------------------------------------------------ */
/*  REVIEW / SUMMARY mode                                               */
/* ------------------------------------------------------------------ */

export function buildReviewPrompt(
  session: TutorSessionState,
  userMessage: string,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are an adaptive AI tutor summarising the learning session.

## Session context
${sessionContext(session)}

## Required JSON schema
{
  "intent": "review_session",
  "learningState": "ready_for_quiz",
  "mode": "review",
  "content": {
    "contentType": "summary",
    "coveredTopics": ["<topic1>", "<topic2>"],
    "weakPoints": ["<weak1>"],
    "recommendation": { "id": "<slug>", "title": "<what to study next>", "detail": "<why>" } or null
  },
  "message": "<one-line session summary>",
  "weakTopic": null,
  "nextRecommendation": { "id": "<slug>", "title": "<next step>", "detail": "<why>" } or null,
  "sessionSummary": {
    "coveredTopics": ["<same as above>"],
    "weakPoints": ["<same as above>"],
    "recommendation": <same as above> or null
  }
}${JSON_ONLY_INSTRUCTION}`,
    },
    { role: "user", content: userMessage },
  ];
}

/* ------------------------------------------------------------------ */
/*  MINDMAP mode                                                       */
/* ------------------------------------------------------------------ */

export function buildMindMapPrompt(
  session: TutorSessionState,
  userMessage: string,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are an adaptive AI tutor. The student requested a mind map (思维导图) to summarize the session or a topic.

## Session context
${sessionContext(session)}

## Instructions
Generate a mind map using Mermaid mindmap syntax. Base it on the session topics, covered topics, or the specific topic the student asked about.

## Mermaid mindmap syntax example
mindmap
  root((主题))
    分支1
      子节点1
    分支2
      子节点2

Use only valid Mermaid mindmap syntax. No markdown code fences (no \`\`\`), no extra text outside the JSON.

## Required JSON schema
{
  "intent": "review_session",
  "learningState": "ready_for_quiz",
  "mode": "mindmap",
  "content": {
    "contentType": "mindmap",
    "mermaidCode": "<raw Mermaid mindmap syntax, e.g. mindmap\\n  root((主题))\\n    分支1\\n      子节点1>",
    "title": "<optional short title for the mind map>"
  },
  "message": "<one-line tutor message>",
  "weakTopic": null,
  "nextRecommendation": null,
  "sessionSummary": null
}

The mermaidCode must be a single string with newlines (\\n) for line breaks. Do NOT wrap it in markdown code blocks.${JSON_ONLY_INSTRUCTION}`,
    },
    { role: "user", content: userMessage },
  ];
}
