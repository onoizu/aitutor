"use client";

import MessageBubble from "@/components/MessageBubble";
import TutorAvatar from "@/components/TutorAvatar";
import ExplanationCard from "@/components/cards/ExplanationCard";
import MindMapCard from "@/components/cards/MindMapCard";
import QuizCard from "@/components/cards/QuizCard";
import RepairCard from "@/components/cards/RepairCard";
import SummaryCard from "@/components/cards/SummaryCard";
import type { LiveTurn } from "@/components/layout/MainLayout";
import type { NotebookEntry } from "@/types/notebook";
import { explanationHeaderForMode } from "@/lib/tutorCardTitles";

interface LiveChatProps {
  turns: LiveTurn[];
  isGenerating?: boolean;
  onAddToNotes?: (entry: NotebookEntry) => void;
  onRequestHint?: (wrongAnswer: string, question: string) => void;
}

export default function LiveChat({ turns, isGenerating, onAddToNotes, onRequestHint }: LiveChatProps) {
  if (turns.length === 0 && !isGenerating) {
    return (
      <div className="rounded-xl border border-dashed border-white/20 bg-neutral-900/50 py-8 text-center text-sm text-white/90">
        Send a message below to start a conversation with the AI tutor.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {turns.map((turn) => {
        if (turn.role === "user") {
          return (
            <MessageBubble key={turn.id} role="user" text={turn.text} />
          );
        }

        if (turn.plainMessage) {
          return (
            <MessageBubble key={turn.id} role="tutor" text={turn.text} />
          );
        }

        const content = turn.response.content;
        const mode = turn.response.mode;
        const showTextInBubble = content.contentType !== "explanation";

        return (
          <MessageBubble key={turn.id} role="tutor" text={showTextInBubble ? turn.text : undefined}>
            {content.contentType === "explanation" && (
              <ExplanationCard
                content={content}
                onAddToNotes={onAddToNotes}
                {...explanationHeaderForMode(mode)}
              />
            )}
            {content.contentType === "quiz" && (
              <QuizCard
                content={content}
                title="⚡ Quiz"
                onAddToNotes={onAddToNotes}
                onRequestHint={onRequestHint}
              />
            )}
            {content.contentType === "repair" && (
              <RepairCard content={content} title="🔧 Repair" onAddToNotes={onAddToNotes} />
            )}
            {content.contentType === "summary" && (
              <SummaryCard content={content} title="✓ Review" onAddToNotes={onAddToNotes} />
            )}
            {content.contentType === "mindmap" && (
              <MindMapCard content={content} />
            )}
          </MessageBubble>
        );
      })}
      {isGenerating && (
        <div
          className="flex items-center gap-3 justify-start py-0.5"
          role="status"
          aria-live="polite"
        >
          <span className="sr-only">Generating response</span>
          <TutorAvatar variant="tutor" />
          <div
            className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-neutral-900/70 px-3.5 py-2.5 shadow-[0_0_24px_-4px_rgba(34,211,238,0.15)] ring-1 ring-white/[0.06] backdrop-blur-sm"
            aria-hidden
          >
            <span className="size-2 rounded-full bg-cyan-400/90 shadow-[0_0_10px_rgba(34,211,238,0.55)] animate-bounce [animation-duration:0.9s] [animation-delay:-0.28s]" />
            <span className="size-2 rounded-full bg-violet-400/90 shadow-[0_0_10px_rgba(167,139,250,0.45)] animate-bounce [animation-duration:0.9s] [animation-delay:-0.14s]" />
            <span className="size-2 rounded-full bg-fuchsia-400/85 shadow-[0_0_10px_rgba(232,121,249,0.45)] animate-bounce [animation-duration:0.9s]" />
          </div>
        </div>
      )}
    </div>
  );
}
