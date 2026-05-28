"use client";

import { useEffect, useState } from "react";

type Status = {
  ok: boolean;
  source: "coze" | "mock";
  message: string;
};

export default function CozeStatus() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/tutor/status")
      .then((res) => res.json() as Promise<Status>)
      .then(setStatus)
      .catch(() =>
        setStatus({
          ok: false,
          source: "mock",
          message: "Unable to fetch connection status",
        }),
      );
  }, []);

  if (!status) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-neutral-800/80 px-2.5 py-1.5 text-xs text-white/90">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-500" />
        检查连接…
      </div>
    );
  }

  const isCoze = status.source === "coze";
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
        isCoze
          ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30"
          : "bg-neutral-800/80 text-white/90 ring-1 ring-white/10"
      }`}
      title={status.message}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          isCoze ? "bg-emerald-400" : "bg-neutral-500"
        }`}
        aria-hidden
      />
      {isCoze ? "Connected to Coze" : "Local Demo"}
    </div>
  );
}
