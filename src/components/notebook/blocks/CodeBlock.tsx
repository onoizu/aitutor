"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { CodeBlock as CodeBlockType } from "@/types/notebook";

const LANGUAGES = [
  "plaintext",
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "c",
  "sql",
  "json",
  "html",
  "css",
  "bash",
];

interface CodeBlockProps {
  block: CodeBlockType;
  onUpdate: (block: CodeBlockType) => void;
}

export default function CodeBlock({ block, onUpdate }: CodeBlockProps) {
  const [code, setCode] = useState(block.code);
  const [language, setLanguage] = useState(block.language);

  const handleBlur = () => {
    if (code !== block.code || language !== block.language) {
      onUpdate({ ...block, code, language });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(block.code);
  };

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-neutral-800/80 px-2 py-1">
        <select
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            onUpdate({ ...block, language: e.target.value });
          }}
          className="rounded border border-white/20 bg-neutral-900 text-xs text-white"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
        >
          Copy
        </button>
      </div>
      <div className="relative">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onBlur={handleBlur}
          spellCheck={false}
          className="absolute inset-0 w-full min-h-[120px] resize-y bg-transparent p-3 font-mono text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-0"
          placeholder="// code here"
        />
        <div className="pointer-events-none min-h-[120px] p-3 font-mono text-sm">
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            customStyle={{
              margin: 0,
              padding: 0,
              background: "transparent",
              fontSize: "inherit",
            }}
            codeTagProps={{ style: { background: "transparent" } }}
            PreTag="div"
          >
            {code || " "}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}
