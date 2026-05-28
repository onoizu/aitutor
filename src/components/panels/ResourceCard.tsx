"use client";

import { cn } from "@/lib/cn";
import type { ResourceItem } from "@/types/tutor";

interface ResourceCardProps {
  item: ResourceItem;
}

const typeIcon: Record<ResourceItem["type"], string> = {
  video: "▶",
  article: "📄",
  doc: "📋",
};

export default function ResourceCard({ item }: ResourceCardProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-neutral-800/60 p-4 ring-1 ring-white/5">
      <div className="flex gap-3">
        {item.thumbnail && (
          <img
            src={item.thumbnail}
            alt=""
            className="h-14 w-20 shrink-0 rounded object-cover bg-neutral-700"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs", item.type === "video" ? "text-red-400" : item.type === "article" ? "text-blue-400" : "text-amber-400")} aria-hidden>
              {typeIcon[item.type]}
            </span>
            {item.source && (
              <span className="text-[11px] text-white/80">{item.source}</span>
            )}
          </div>
          <div className="mt-0.5 font-medium text-white">{item.title}</div>
          {item.reason && (
            <p className="mt-1 text-xs text-white/90 leading-relaxed">
              {item.reason}
            </p>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center rounded-md bg-white/15 px-2 py-1 text-[11px] font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-white/25"
            >
              Open Resource
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
