"use client";

import type { ResourceItem } from "@/types/tutor";
import ResourceCard from "./ResourceCard";

interface RecommendedResourcesPanelProps {
  resources: ResourceItem[];
  title?: string;
}

export default function RecommendedResourcesPanel({
  resources,
  title = "Recommended Resources",
}: RecommendedResourcesPanelProps) {
  if (!resources || resources.length === 0) return null;

  return (
    <section className="rounded-xl bg-neutral-900/80 p-3 ring-1 ring-white/10">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
        {title}
      </div>
      <ul className="mt-2 space-y-2">
        {resources.map((item, i) => (
          <li key={i}>
            <ResourceCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
