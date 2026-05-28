/**
 * Build a self-contained HTML document for iframe print / Save as PDF.
 * Uses an empty <title> and a minimal document so browser print headers
 * show little or no site branding (user may still need to uncheck
 * "Headers and footers" in Chrome for a fully clean PDF).
 */

import { getBlocksFromContent } from "@/lib/notebook/blockModel";
import type { Block } from "@/types/notebook";
import type { NotebookEntry } from "@/types/notebook";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function blockToPrintHtml(block: Block): string {
  switch (block.type) {
    case "text": {
      if (!block.content?.trim()) return "";
      if (block.content.trim().startsWith("<")) {
        return `<div class="nb-text">${block.content}</div>`;
      }
      return `<p>${escapeHtml(block.content)}</p>`;
    }
    case "heading": {
      const tag = `h${block.level}` as "h1" | "h2" | "h3";
      return `<${tag} class="nb-h">${escapeHtml(block.content)}</${tag}>`;
    }
    case "code":
      return `<pre class="nb-code"><code>${escapeHtml(block.code || " ")}</code></pre>`;
    case "table": {
      const heads = block.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
      const body = block.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
        )
        .join("");
      return `<table class="nb-table"><thead><tr>${heads}</tr></thead><tbody>${body}</tbody></table>`;
    }
    case "callout": {
      const variantClass =
        block.variant === "warning"
          ? "nb-callout-warn"
          : block.variant === "tip"
            ? "nb-callout-tip"
            : block.variant === "definition"
              ? "nb-callout-def"
              : "nb-callout-info";
      return `<div class="nb-callout ${variantClass}">${escapeHtml(block.content)}</div>`;
    }
    case "annotation":
      return `<div class="nb-anno"><strong>${escapeHtml(block.category)}</strong> ${escapeHtml(block.content)}</div>`;
    case "chart":
      return `<p class="nb-muted">[Chart: ${escapeHtml(block.title || block.chartType)}]</p>`;
    default:
      return "";
  }
}

function contentToPrintHtml(content: string): string {
  const blocks = getBlocksFromContent(content);
  return blocks.map((b) => blockToPrintHtml(b)).filter(Boolean).join("\n");
}

const PRINT_STYLES = `
@page { size: auto; margin: 12mm; }
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #000;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.55;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.nb-root { padding: 4px 8px; }
.nb-entry {
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #d1d5db;
  break-inside: avoid;
  page-break-inside: avoid;
}
.nb-entry:last-child { border-bottom: none; margin-bottom: 0; }
.nb-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
.nb-title { font-size: 0.875rem; font-weight: 600; margin: 0; color: #000; }
.nb-tag {
  font-size: 10px;
  padding: 2px 6px;
  background: #e5e7eb;
  color: #374151;
  border-radius: 4px;
}
.nb-blocks > * { margin: 0.35rem 0; }
.nb-blocks p { margin: 0.35rem 0; }
.nb-h { font-weight: 600; margin: 0.5rem 0 0.25rem; color: #000; }
h1.nb-h { font-size: 1.35rem; }
h2.nb-h { font-size: 1.15rem; }
h3.nb-h { font-size: 1rem; }
.nb-code {
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  padding: 0.65rem;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  border-radius: 6px;
}
.nb-table { border-collapse: collapse; width: 100%; font-size: 13px; }
.nb-table th, .nb-table td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; }
.nb-table th { background: #f3f4f6; font-weight: 600; }
.nb-callout { border: 1px solid #93c5fd; background: #eff6ff; padding: 10px 12px; border-radius: 8px; font-size: 13px; }
.nb-callout-warn { border-color: #f59e0b; background: #fffbeb; }
.nb-callout-tip { border-color: #10b981; background: #ecfdf5; }
.nb-callout-def { border-color: #a855f7; background: #faf5ff; }
.nb-anno { font-size: 13px; border-left: 3px solid #6b7280; padding-left: 10px; margin: 0.5rem 0; }
.nb-muted { color: #6b7280; font-size: 13px; }
`;

/** Full HTML document for printing from a hidden iframe (avoids main page title/URL in headers). */
export function buildNotebookPrintDocument(
  entries: NotebookEntry[],
  getContent: (e: NotebookEntry) => string,
  getTitle: (e: NotebookEntry) => string,
  sourceLabel: Record<string, string>,
): string {
  const bodyInner = entries
    .map((entry) => {
      const title = escapeHtml(getTitle(entry));
      const tag =
        entry.sourceType != null
          ? `<span class="nb-tag">${escapeHtml(sourceLabel[entry.sourceType] ?? entry.sourceType)}</span>`
          : "";
      const blocksHtml = contentToPrintHtml(getContent(entry));
      return `
<div class="nb-entry">
  <div class="nb-meta">
    <h3 class="nb-title">${title}</h3>
    ${tag}
  </div>
  <div class="nb-blocks">${blocksHtml || "<p class=\"nb-muted\">(empty)</p>"}</div>
</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title></title>
<style>${PRINT_STYLES}</style>
</head>
<body>
<div class="nb-root">
${bodyInner}
</div>
</body>
</html>`;
}
