"use client";

import MessageBubble from "@/components/MessageBubble";
import ExplanationCard from "@/components/cards/ExplanationCard";
import MindMapCard from "@/components/cards/MindMapCard";
import QuizCard from "@/components/cards/QuizCard";
import RepairCard from "@/components/cards/RepairCard";
import SummaryCard from "@/components/cards/SummaryCard";
import {
  teachModeExample,
  quizModeExample,
  repairModeExample,
  reviewModeExample,
  mindmapModeExample,
} from "@/data/mockTutorData";
import type { TutorResponse } from "@/types/tutor";
import type { NotebookEntry } from "@/types/notebook";
import { explanationHeaderForMode } from "@/lib/tutorCardTitles";

type ChatTurn =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "tutor"; text: string; response: TutorResponse };

const mockTurns: ChatTurn[] = [
  {
    id: "u1",
    role: "user",
    text: "I’m confused about why BST search is O(log n). Can you explain it?",
  },
  {
    id: "t1",
    role: "tutor",
    text: "Sure. Here’s the concept overview and a concrete example:",
    response: teachModeExample,
  },
  {
    id: "u2",
    role: "user",
    text: "That helps. Can we try a quick quiz now?",
  },
  {
    id: "t2",
    role: "tutor",
    text: "Absolutely. Try this 1-question check on search complexity:",
    response: quizModeExample,
  },
  {
    id: "u3",
    role: "user",
    text: "I think the worst-case is O(n) for a balanced BST.",
  },
  {
    id: "t3",
    role: "tutor",
    text: "Close, but not quite—let’s repair the misconception:",
    response: repairModeExample,
  },
  {
    id: "t4",
    role: "tutor",
    text: "Here’s a short summary of what you’ve learned and what to do next:",
    response: reviewModeExample,
  },
  {
    id: "u5",
    role: "user",
    text: "Generate a mind map summary",
  },
  {
    id: "t5",
    role: "tutor",
    text: "Here is a mind map to help you review what you've learned.",
    response: mindmapModeExample,
  },
];

interface ChatWindowProps {
  onAddToNotes?: (entry: NotebookEntry) => void;
  onRequestHint?: (wrongAnswer: string, question: string) => void;
}

export default function ChatWindow({ onAddToNotes, onRequestHint }: ChatWindowProps) {
  return (
    <div className="space-y-3">
      {mockTurns.map((turn) => {
        if (turn.role === "user") {
          return (
            <MessageBubble key={turn.id} role="user" text={turn.text} />
          );
        }

        const content = turn.response.content;
        const mode = turn.response.mode;

        return (
          <MessageBubble key={turn.id} role="tutor" text={turn.text}>
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
                wrongAnswer="I think the worst-case is O(n) for a balanced BST."
              />
            )}
            {content.contentType === "repair" && (
              <RepairCard
                content={content}
                title="🔧 Repair"
                wrongAnswer="I think the worst-case is O(n) for a balanced BST."
                onAddToNotes={onAddToNotes}
              />
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
    </div>
  );
}

