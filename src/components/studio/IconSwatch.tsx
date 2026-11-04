import { useEffect, useRef } from "react";
import { drawIcon } from "@/lib/ribbon/icons";
import { renderRibbon } from "@/lib/ribbon/render";
import type { RibbonDoc } from "@/lib/ribbon/types";

export function IconSwatch({
  id,
  fill = "#E8D48A",
  className = "size-8",
}: {
  id: string;
  fill?: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const s = 64;
    c.width = s;
    c.height = s;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, s, s);
    ctx.translate(s / 2, s / 2);
    ctx.scale(s * 0.42, s * 0.42);
    drawIcon(ctx, id, fill, fill);
  }, [id, fill]);
  return <canvas ref={ref} className={className} />;
}

export function RibbonThumb({ doc }: { doc: RibbonDoc }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const w = 72;
    const scale = w / Math.max(1, doc.width);
    c.width = w;
    c.height = Math.max(1, Math.round(doc.height * scale));
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    renderRibbon(ctx, doc, { scale, pixelSnap: true });
  }, [doc]);
  return <canvas ref={ref} className="h-4 w-12 shrink-0 rounded-[2px]" />;
}
