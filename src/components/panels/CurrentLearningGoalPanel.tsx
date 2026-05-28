"use client";

interface CurrentLearningGoalPanelProps {
  goals: string[];
  title?: string;
}

export default function CurrentLearningGoalPanel({
  goals,
  title = "Current Learning Goal",
}: CurrentLearningGoalPanelProps) {
  if (!goals || goals.length === 0) return null;

  return (
    <section className="rounded-xl bg-neutral-900/80 p-3 ring-1 ring-white/10">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
        {title}
      </div>
      <ul className="mt-2 space-y-1.5">
        {goals.map((goal, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" aria-hidden />
            <span className="leading-relaxed text-white">{goal}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
