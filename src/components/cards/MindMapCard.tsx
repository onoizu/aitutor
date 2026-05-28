"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import type { MindMapContent } from "@/types/tutor";

interface MindMapCardProps {
  content: MindMapContent;
}

function svgToPngDataUrl(svgString: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.fillStyle = "#171717";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      URL.revokeObjectURL(url);
      resolve(pngUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG as image"));
    };
    img.src = url;
  });
}

function downloadPng(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename || "mindmap.png";
  a.click();
}

export default function MindMapCard({ content }: MindMapCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const idRef = useRef(`mindmap-${Math.random().toString(36).slice(2, 11)}`);

  useEffect(() => {
    const code = content.mermaidCode?.trim();
    if (!code) {
      setError("No mind map content");
      return;
    }

    let cancelled = false;
    setError(null);
    setSvg(null);

    const run = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
        });
        const { svg: renderedSvg } = await mermaid.render(idRef.current, code);
        if (!cancelled) {
          setSvg(renderedSvg);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render mind map");
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [content.mermaidCode]);

  const handleExportPng = useCallback(async () => {
    if (!svg) return;
    setIsExporting(true);
    try {
      const dataUrl = await svgToPngDataUrl(svg);
      downloadPng(dataUrl, `${content.title || "mindmap"}.png`);
    } catch {
      // ignore
    } finally {
      setIsExporting(false);
    }
  }, [svg, content.title]);

  if (error) {
    return (
      <section className="rounded-2xl border border-amber-500/30 bg-neutral-900/60 p-5 shadow-xl backdrop-blur-sm ring-1 ring-amber-500/20">
        <header className="mb-3">
          <h2 className="text-base font-semibold text-white">
            🗺 Mind map{content.title ? ` · ${content.title}` : ""}
          </h2>
          <p className="mt-1 text-sm text-amber-400/90">
            Mermaid syntax error — unable to render mind map.
          </p>
        </header>
        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-neutral-800/60 p-3 text-xs text-white/80">
          {content.mermaidCode}
        </pre>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 shadow-xl backdrop-blur-sm ring-1 ring-white/5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">
            🗺 Mind map{content.title ? ` · ${content.title}` : ""}
          </h2>
          <p className="mt-0.5 text-xs text-white/70">
            Generated from session content. Export as PNG.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {svg && (
            <button
              type="button"
              onClick={handleExportPng}
              disabled={isExporting}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-50"
            >
              {isExporting ? "Exporting…" : "Export PNG"}
            </button>
          )}
        </div>
      </header>

      <div
        ref={containerRef}
        className="flex min-h-[200px] items-center justify-center overflow-auto rounded-xl border border-white/10 bg-neutral-800/40 p-4"
      >
        {!svg && !error && (
          <span className="text-sm text-white/70">Rendering…</span>
        )}
        {svg && (
          <div
            className="mermaid-output [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
    </section>
  );
}
