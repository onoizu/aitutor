"use client";

import { getBlocksFromContent } from "@/lib/notebook/blockModel";
import type { Block } from "@/types/notebook";

interface BlocksPreviewProps {
  content: string;
  expanded?: boolean;
}

function BlockPreview({ block }: { block: Block }) {
  switch (block.type) {
    case "text": {
      const html =
        !block.content?.trim()
          ? "<p></p>"
          : block.content.trim().startsWith("<")
            ? block.content
            : `<p>${block.content
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")}</p>`;
      return (
        <div
          className="prose prose-invert prose-sm max-w-none text-white/90"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    case "heading": {
      const Tag = `h${block.level}` as "h1" | "h2" | "h3";
      const sizes = { 1: "text-2xl", 2: "text-xl", 3: "text-lg" };
      return (
        <Tag className={`font-semibold text-white ${sizes[block.level]}`}>
          {block.content}
        </Tag>
      );
    }
    case "code":
      return (
        <pre className="overflow-x-auto rounded-lg border border-white/10 bg-neutral-900/80 p-3 font-mono text-sm text-white">
          <code>{block.code || " "}</code>
        </pre>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-white/20">
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th
                    key={i}
                    className="border border-white/20 bg-neutral-800/80 px-2 py-1.5 text-left text-sm font-medium text-white"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border border-white/20 px-2 py-1.5 text-sm text-white/90"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout": {
      const styles: Record<string, string> = {
        info: "border-blue-500/30 bg-blue-500/10",
        warning: "border-amber-500/30 bg-amber-500/10",
        tip: "border-emerald-500/30 bg-emerald-500/10",
        definition: "border-purple-500/30 bg-purple-500/10",
      };
      return (
        <div
          className={`rounded-lg border p-3 text-sm text-white/90 ${styles[block.variant] ?? styles.info}`}
        >
          {block.content}
        </div>
      );
    }
    default:
      return null;
  }
}

export default function BlocksPreview({ content, expanded }: BlocksPreviewProps) {
  const blocks = getBlocksFromContent(content);

  return (
    <div
      className={`space-y-2 text-base leading-relaxed font-sans ${expanded ? "min-h-[60vh]" : ""}`}
    >
      {blocks.map((block) => (
        <BlockPreview key={block.id} block={block} />
      ))}
    </div>
  );
}
