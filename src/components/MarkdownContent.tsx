"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { cn } from "@/lib/cn";

interface MarkdownContentProps {
  children: string;
  className?: string;
  compact?: boolean;
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-1.5 mt-3 text-lg font-bold text-white first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-1.5 mt-2.5 text-base font-semibold text-white first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-2.5 text-sm font-semibold text-white first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-white/90">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <pre className="my-2 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs ring-1 ring-white/10">
          <code className={className}>{children}</code>
        </pre>
      );
    }
    return (
      <code className="rounded bg-white/10 px-1 py-0.5 text-[13px] text-amber-200">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-white/30 pl-3 text-white/80">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-cyan-300 underline decoration-white/20 hover:decoration-cyan-300/60"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-3 border-white/15" />,
};

export default function MarkdownContent({
  children,
  className,
  compact = false,
}: MarkdownContentProps) {
  if (!children?.trim()) return null;

  return (
    <div
      className={cn(
        "prose-invert text-sm text-white/90",
        compact && "text-[13px]",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
