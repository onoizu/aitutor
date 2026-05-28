"use client";

import { cn } from "@/lib/cn";
import RobotTutorIcon from "@/components/icons/RobotTutorIcon";

type AvatarVariant = "tutor" | "user";

interface TutorAvatarProps {
  variant?: AvatarVariant;
  className?: string;
}

export default function TutorAvatar({ variant = "tutor", className }: TutorAvatarProps) {
  const isTutor = variant === "tutor";

  return (
    <div
      className={cn(
        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
        "shadow-lg ring-2 ring-inset",
        isTutor
          ? "bg-gradient-to-br from-cyan-400/35 via-violet-500/30 to-fuchsia-500/25 ring-white/25 shadow-cyan-500/15"
          : "bg-gradient-to-br from-slate-400/25 to-slate-600/20 ring-white/20 shadow-black/20",
        className,
      )}
      aria-hidden
    >
      {isTutor ? (
        <RobotTutorIcon className="h-[18px] w-[18px] text-white drop-shadow-sm" />
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="h-[17px] w-[17px] text-white/95 drop-shadow-sm"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
        </svg>
      )}
    </div>
  );
}
