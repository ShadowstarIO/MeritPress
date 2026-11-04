import { useEffect, useRef } from "react";
import { renderRibbon } from "@/lib/ribbon/render";
import type { RibbonDoc } from "@/lib/ribbon/types";
import { cn } from "@/lib/cn";

export function RibbonPreview({
  doc,
  className,
  maxWidth = 420,
}: {
  doc: RibbonDoc;
  className?: string;
  maxWidth?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = Math.min(maxWidth, canvas.parentElement?.clientWidth || maxWidth);
    const scale = Math.max(2, (cssW / doc.width) * dpr);
    canvas.width = Math.round(doc.width * scale);
    canvas.height = Math.round(doc.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    renderRibbon(ctx, doc, { scale });
  }, [doc, maxWidth]);

  return (
    <canvas
      ref={ref}
      className={cn("ribbon-shadow block h-auto w-full max-w-full rounded-[2px]", className)}
      style={{ maxWidth, aspectRatio: `${doc.width} / ${doc.height}` }}
    />
  );
}
