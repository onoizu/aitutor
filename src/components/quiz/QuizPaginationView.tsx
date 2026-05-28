"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { QuizSession, QuizContent, RepairContent, RepairResult, TutorResponse } from "@/types/tutor";
import type { NotebookEntry } from "@/types/notebook";
import QuizCard from "@/components/cards/QuizCard";
import RepairCard from "@/components/cards/RepairCard";
import CorrectAfterRepairCard from "@/components/quiz/CorrectAfterRepairCard";

interface QuizPaginationViewProps {
  quizSession: QuizSession;
  onRequestRepair?: (wrongAnswer: string, question: string) => Promise<RepairResult | null>;
  onRequestCorrectAfterRepair?: (
    question: string,
    wrongAnswer: string,
    correctAnswer: string,
    explanation: string,
  ) => Promise<TutorResponse | null>;
  onComplete?: () => void;
  onAddToNotes?: (entry: NotebookEntry) => void;
  onRepairModeChange?: (inRepair: boolean) => void;
}

interface QuestionResult {
  correct: boolean;
  userAnswer: string;
}

export default function QuizPaginationView({
  quizSession,
  onRequestRepair,
  onRequestCorrectAfterRepair,
  onComplete,
  onAddToNotes,
  onRepairModeChange,
}: QuizPaginationViewProps) {
  const { questions } = quizSession;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<Map<number, QuestionResult>>(new Map());
  const [showCorrectBanner, setShowCorrectBanner] = useState(false);
  const [repairContent, setRepairContent] = useState<RepairContent | null>(null);
  const [repairLoading, setRepairLoading] = useState(false);
  const [wrongAnswer, setWrongAnswer] = useState("");
  const [finished, setFinished] = useState(false);
  const [repairedQuestions, setRepairedQuestions] = useState<Set<number>>(new Set());
  const [correctAfterRepairData, setCorrectAfterRepairData] = useState<{
    question: QuizContent;
    wrongAnswer: string;
    summary: string;
    weakTopic: TutorResponse["weakTopic"];
    nextRecommendation: TutorResponse["nextRecommendation"];
  } | null>(null);
  const [correctAfterRepairLoading, setCorrectAfterRepairLoading] = useState(false);

  const current = questions[currentIdx];
  const total = questions.length;
  const hadRepairForCurrent = repairedQuestions.has(currentIdx);

  useEffect(() => {
    onRepairModeChange?.(repairContent !== null);
    return () => onRepairModeChange?.(false);
  }, [repairContent, onRepairModeChange]);

  const goToNext = useCallback(() => {
    setShowCorrectBanner(false);
    setRepairContent(null);
    setWrongAnswer("");
    setCorrectAfterRepairData(null);
    if (currentIdx + 1 < total) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setFinished(true);
    }
  }, [currentIdx, total]);

  const lastWrongAnswerRef = useRef("");

  const tryAgain = useCallback(() => {
    setRepairContent(null);
    setWrongAnswer("");
  }, []);

  useEffect(() => {
    if (!showCorrectBanner || hadRepairForCurrent) return;
    const timer = setTimeout(goToNext, 1500);
    return () => clearTimeout(timer);
  }, [showCorrectBanner, hadRepairForCurrent, goToNext]);

  async function handleRequestHint(answer: string, question: string) {
    setWrongAnswer(answer);
    lastWrongAnswerRef.current = answer;

    if (onRequestRepair) {
      setRepairLoading(true);
      const result = await onRequestRepair(answer, question);
      setRepairLoading(false);

      if (result?.isCorrect) {
        setResults((prev) => new Map(prev).set(currentIdx, { correct: true, userAnswer: answer }));
        setShowCorrectBanner(true);
        return;
      }

      setResults((prev) => new Map(prev).set(currentIdx, { correct: false, userAnswer: answer }));
      setRepairedQuestions((prev) => new Set(prev).add(currentIdx));
      setRepairContent(result?.repair ?? null);
    } else {
      setResults((prev) => new Map(prev).set(currentIdx, { correct: false, userAnswer: answer }));
    }
  }

  async function handleCorrectAfterRepair() {
    if (!onRequestCorrectAfterRepair || !current) return;
    const correctAns =
      typeof current.correctAnswer === "string"
        ? current.correctAnswer
        : Array.isArray(current.correctAnswer)
          ? current.correctAnswer[0]
          : "";
    setCorrectAfterRepairLoading(true);
    const res = await onRequestCorrectAfterRepair(
      current.question,
      wrongAnswer,
      correctAns,
      current.explanation,
    );
    setCorrectAfterRepairLoading(false);
    if (res) {
      const summary =
        res.content?.contentType === "explanation"
          ? (res.content as { definition?: string }).definition ?? res.message
          : res.message;
      setCorrectAfterRepairData({
        question: current,
        wrongAnswer,
        summary,
        weakTopic: res.weakTopic ?? null,
        nextRecommendation: res.nextRecommendation ?? null,
      });
    } else {
      setCorrectAfterRepairData({
        question: current,
        wrongAnswer,
        summary: "Correct! Please continue.",
        weakTopic: null,
        nextRecommendation: null,
      });
    }
  }

  function handleSubmitAnswer(answer: string | string[]) {
    const answerStr = Array.isArray(answer) ? answer.join(", ") : answer;
    const hasKnown =
      typeof current.correctAnswer === "string"
        ? current.correctAnswer.length > 0
        : Array.isArray(current.correctAnswer) && current.correctAnswer.length > 0;

    if (hasKnown) {
      const correct =
        typeof current.correctAnswer === "string"
          ? answerStr === current.correctAnswer
          : Array.isArray(current.correctAnswer) && current.correctAnswer.includes(answerStr);
      if (correct) {
        setResults((prev) => new Map(prev).set(currentIdx, { correct: true, userAnswer: answerStr }));
        if (repairedQuestions.has(currentIdx)) {
          setWrongAnswer(lastWrongAnswerRef.current);
          handleCorrectAfterRepair();
        } else {
          setShowCorrectBanner(true);
        }
        return;
      }
    }
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-12">
        <button
          type="button"
          onClick={onComplete}
          className="btn-primary inline-flex items-center justify-center rounded-xl px-6 py-2.5 text-sm font-semibold"
        >
          Back to Chat
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === currentIdx
                  ? "w-6 bg-white"
                  : results.has(i)
                    ? results.get(i)!.correct
                      ? "w-2 bg-emerald-400"
                      : "w-2 bg-red-400"
                    : "w-2 bg-white/20"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-white/70">
          Question {currentIdx + 1} / {total}
        </span>
      </div>

      {/* Correct banner (only when no repair - auto advance) */}
      {showCorrectBanner && !hadRepairForCurrent && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3">
          <span className="text-emerald-400 text-lg">✓</span>
          <span className="text-sm font-medium text-emerald-300">Correct! Moving to next question...</span>
        </div>
      )}

      {/* Correct after repair - summary card */}
      {correctAfterRepairData && (
        <CorrectAfterRepairCard
          question={correctAfterRepairData.question}
          wrongAnswer={correctAfterRepairData.wrongAnswer}
          summary={correctAfterRepairData.summary}
          weakTopic={correctAfterRepairData.weakTopic}
          nextRecommendation={correctAfterRepairData.nextRecommendation}
          onAddToNotes={onAddToNotes}
          onAddToWrongBook={onAddToNotes}
          onContinue={goToNext}
        />
      )}

      {/* Loading correct-after-repair */}
      {correctAfterRepairLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-neutral-900/60 px-4 py-8">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <span className="text-sm text-white/70">Generating summary...</span>
        </div>
      )}

      {/* Quiz card for current question */}
      {!showCorrectBanner &&
        !repairContent &&
        !repairLoading &&
        !correctAfterRepairData &&
        !correctAfterRepairLoading && (
          <QuizCard
            key={`q-${currentIdx}`}
            content={current}
            title={`Question ${currentIdx + 1}`}
            onSubmitAnswer={handleSubmitAnswer}
            onRequestHint={handleRequestHint}
            onAddToNotes={onAddToNotes}
          />
        )}

      {/* Loading repair */}
      {repairLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-neutral-900/60 px-4 py-8">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <span className="text-sm text-white/70">Getting feedback...</span>
        </div>
      )}

      {/* Repair card for wrong answer */}
      {repairContent && (
        <div className="space-y-4">
          <RepairCard
            content={repairContent}
            wrongAnswer={wrongAnswer}
            question={current.question}
            onAddToNotes={onAddToNotes}
            title="Detailed Hint"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={tryAgain}
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
            >
              Try Again with Hint →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
