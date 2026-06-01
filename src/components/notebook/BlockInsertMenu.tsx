"use client";

import { useState, useRef, useEffect } from "react";
import type { BlockType } from "@/types/notebook";

const BLOCK_OPTIONS: { type: BlockType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "heading", label: "Heading" },
  { type: "code", label: "Code" },
  { type: "table", label: "Table" },
  { type: "callout", label: "Callout" },
];

interface BlockInsertMenuProps {
  onInsert: (type: BlockType) => void;
  /** Optional label for the trigger button */
  label?: string;
}

export default function BlockInsertMenu({ onInsert, label = "Add block" }: BlockInsertMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/30 px-3 py-2 text-sm text-white/70 transition-colors hover:border-white/50 hover:bg-white/5 hover:text-white"
      >
        <span aria-hidden>+</span>
        {label}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1 min-w-[160px] rounded-lg border border-white/10 bg-neutral-800 py-1 shadow-xl">
          {BLOCK_OPTIONS.map(({ type, label: l }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onInsert(type);
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10"
            >
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
