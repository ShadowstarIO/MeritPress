import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  drawStudioGrid,
  hitDivider,
  hitLayer,
  hitStripe,
  layoutStripes,
  preloadImage,
  renderRibbon,
} from "@/lib/ribbon/render";
import { useRibbonStore } from "@/lib/ribbon/store";
import { roundPx, snapValue } from "@/lib/ribbon/columns";
import type { Layer, RibbonDoc, Selection } from "@/lib/ribbon/types";

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rot" | "skew";

type Drag =
  | { kind: "none" }
  | {
      kind: "layer";
      ids: string[];
      ox: number;
      oy: number;
      start: { id: string; x: number; y: number; rotation: number; w: number; h: number; skewX: number }[];
      moved: boolean;
      toggle: boolean;
      captured: boolean;
    }
  | { kind: "divider"; leftId: string; rightId: string; startX: number; leftW: number; rightW: number; index: number; edge: number }
  | { kind: "resize"; id: string; handle: Handle; start: Layer }
  | { kind: "rotate"; id: string; startAngle: number; cx: number; cy: number }
  | { kind: "skew"; id: string; start: Layer; ox: number }
  | { kind: "marquee"; x: number; y: number; x2: number; y2: number }
  | {
      kind: "pan";
      ox: number;
      oy: number;
      startX: number;
      startY: number;
      moved: boolean;
    }
  | {
      kind: "brush";
      layerId: string;
      canvas: HTMLCanvasElement;
      lastX: number;
      lastY: number;
      color: string;
    };

export function RibbonCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag>({ kind: "none" });
  const docs = useRibbonStore((s) => s.docs);
  const activeId = useRibbonStore((s) => s.activeId);
  const zoom = useRibbonStore((s) => s.zoom);
  const panX = useRibbonStore((s) => s.panX);
  const panY = useRibbonStore((s) => s.panY);
  const spaceHeld = useRibbonStore((s) => s.spaceHeld);
  const showGrid = useRibbonStore((s) => s.showGrid);
  const showGuides = useRibbonStore((s) => s.showGuides);
  const selection = useRibbonStore((s) => s.selection);
  const selectedIds = useRibbonStore((s) => s.selectedIds);
  const snap = useRibbonStore((s) => s.snap);
  const tool = useRibbonStore((s) => s.tool);
  const xform = useRibbonStore((s) => s.xform);
  const doc = docs.find((d) => d.id === activeId) ?? docs[0];
  const [grabbing, setGrabbing] = useState(false);
  const [well, setWell] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !doc) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const scale = zoom * dpr;
    canvas.width = Math.round(doc.width * scale);
    canvas.height = Math.round(doc.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    renderRibbon(ctx, doc, { scale, quality: "smooth" });
    drawOverlay(ctx, doc, scale, selection, selectedIds, showGrid, showGuides, drag.current);
  }, [doc, zoom, selection, selectedIds, showGrid, showGuides]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const store = useRibbonStore.getState();
      const rect = wrap.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      store.zoomAt(
        store.zoom * factor,
        e.clientX - rect.left,
        e.clientY - rect.top,
        rect.width,
        rect.height,
      );
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });
    const onTouch = (e: TouchEvent) => e.preventDefault();
    wrap.addEventListener("touchmove", onTouch, { passive: false });
    return () => {
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("touchmove", onTouch);
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setWell({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc]);

  if (!doc) return null;

  const cssW = doc.width * zoom;
  const cssH = doc.height * zoom;

  const toLocal = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * doc.width,
      y: ((clientY - r.top) / r.height) * doc.height,
    };
  };

  const cursor =
    grabbing || spaceHeld
      ? "cursor-grabbing"
      : tool === "eyedrop"
        ? "cursor-cell"
        : tool === "brush"
          ? "cursor-crosshair"
          : tool === "fill"
            ? "cursor-cell"
            : tool === "erase"
              ? "cursor-not-allowed"
              : "cursor-crosshair";

  const beginPan = (clientX: number, clientY: number) => {
    const store = useRibbonStore.getState();
    drag.current = {
      kind: "pan",
      ox: clientX,
      oy: clientY,
      startX: store.panX,
      startY: store.panY,
      moved: false,
    };
    setGrabbing(true);
  };

  return (
    <div
      ref={wrapRef}
      data-canvas-well
      data-pan-x={Math.round(panX)}
      data-pan-y={Math.round(panY)}
      className={cn(
        "studio-well relative order-1 min-h-[240px] flex-1 overflow-hidden touch-none overscroll-none md:order-2",
        grabbing || spaceHeld ? "cursor-grabbing" : "cursor-grab",
      )}
      onPointerDown={(e) => {
        if (e.button === 1 || e.altKey || useRibbonStore.getState().spaceHeld) {
          e.preventDefault();
          beginPan(e.clientX, e.clientY);
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
            /* synthetic / lost pointer */
          }
          return;
        }
        if (e.button !== 0) return;
        const onArt = e.target === canvasRef.current;
        if (!onArt) {
          e.preventDefault();
          beginPan(e.clientX, e.clientY);
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
            /* synthetic / lost pointer */
          }
          return;
        }
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        e.preventDefault();
        const { x, y } = toLocal(e.clientX, e.clientY);
        const store = useRibbonStore.getState();

        if (store.tool === "eyedrop") {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d");
          if (canvas && ctx) {
            const r = canvas.getBoundingClientRect();
            const px = Math.floor(((e.clientX - r.left) / r.width) * canvas.width);
            const py = Math.floor(((e.clientY - r.top) / r.height) * canvas.height);
            const d = ctx.getImageData(px, py, 1, 1).data;
            store.applySample(rgbHex(d[0], d[1], d[2]));
          }
          store.setTool("select");
          return;
        }

        if (store.tool === "fill") {
          const layer = hitLayer(doc, x, y);
          if (layer) store.fillAt("layer", layer.id);
          else {
            const stripe = hitStripe(doc, x);
            if (stripe && !stripe.locked && stripe.visible !== false) store.fillAt("stripe", stripe.id);
          }
          return;
        }

        if (store.tool === "erase") {
          const layer = hitLayer(doc, x, y);
          if (layer && !layer.locked) store.removeLayer(layer.id);
          else {
            const stripe = hitStripe(doc, x);
            if (stripe && !stripe.locked) store.removeStripe(stripe.id);
          }
          return;
        }

        if (store.tool === "brush") {
          store.capture();
          const over = 4;
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(doc.width * over));
          canvas.height = Math.max(1, Math.round(doc.height * over));
          const ctx = canvas.getContext("2d");
          if (ctx) {
            paintStroke(ctx, x, y, x, y, over, store.currentColor);
            const src = canvas.toDataURL("image/png");
            store.addImage(src);
            const next = useRibbonStore.getState().docs.find((d) => d.id === store.activeId);
            const layer = next?.layers.at(-1);
            if (layer) {
              void preloadImage(src).then(() => {
                useRibbonStore.getState().updateLayer(layer.id, {
                  name: "Brush",
                  x: 0.5,
                  y: 0.5,
                  w: 1,
                  h: 1,
                  src,
                  fill: store.currentColor,
                  strokeWidth: 0,
                  finish: "flat",
                });
              });
              drag.current = {
                kind: "brush",
                layerId: layer.id,
                canvas,
                lastX: x,
                lastY: y,
                color: store.currentColor,
              };
            }
          }
          return;
        }

        if (store.tool === "marquee") {
          drag.current = { kind: "marquee", x, y, x2: x, y2: y };
          return;
        }

        const slop = 3 / zoom;
        const div = hitDivider(doc, x, Math.max(1.6, slop * 6));
        if (div != null && store.tool === "select") {
          const rows = layoutStripes(doc);
          store.capture();
          store.setSelection({ kind: "stripe", id: rows[div].stripe.id });
          drag.current = {
            kind: "divider",
            leftId: rows[div].stripe.id,
            rightId: rows[div + 1].stripe.id,
            startX: x,
            leftW: rows[div].stripe.weight,
            rightW: rows[div + 1].stripe.weight,
            index: div,
            edge: rows[div].x + rows[div].w,
          };
          return;
        }

        if (selection.kind === "layer" && (store.tool === "select" || store.tool === "move")) {
          const layer = doc.layers.find((l) => l.id === selection.id);
          if (layer && !layer.locked) {
            const h = hitHandle(layer, doc, x, y, zoom);
            if (h === "rot" || store.xform === "rotate") {
              store.capture();
              drag.current = {
                kind: "rotate",
                id: layer.id,
                startAngle: layer.rotation,
                cx: layer.x * doc.width,
                cy: layer.y * doc.height,
              };
              return;
            }
            if (h === "skew" || store.xform === "skew") {
              store.capture();
              drag.current = { kind: "skew", id: layer.id, start: { ...layer }, ox: x };
              return;
            }
            if (h && (store.xform === "stretch" || store.xform === "move" || store.tool === "select")) {
              store.capture();
              drag.current = { kind: "resize", id: layer.id, handle: h, start: { ...layer } };
              return;
            }
          }
        }

        const layer = hitLayer(doc, x, y);
        if (layer) {
          const already = store.selectedIds.length === 1 && store.selectedIds[0] === layer.id;
          if (!already) store.setSelection({ kind: "layer", id: layer.id }, e.shiftKey);
          if (store.tool === "stamp") {
            store.duplicateLayer(layer.id);
            return;
          }
          const ids = e.shiftKey
            ? store.selectedIds.includes(layer.id)
              ? store.selectedIds
              : [...store.selectedIds, layer.id]
            : groupedIds(doc, layer.id);
          const start = doc.layers
            .filter((l) => ids.includes(l.id))
            .map((l) => ({
              id: l.id,
              x: l.x,
              y: l.y,
              rotation: l.rotation,
              w: l.w,
              h: l.h,
              skewX: l.skewX,
            }));
          drag.current = {
            kind: "layer",
            ids,
            ox: x,
            oy: y,
            start,
            moved: false,
            toggle: already && !e.shiftKey,
            captured: false,
          };
          return;
        }

        const stripe = hitStripe(doc, x);
        if (stripe) {
          if (selection.kind === "stripe" && selection.id === stripe.id) {
            store.setSelection({ kind: "none" });
          } else {
            store.setSelection({ kind: "stripe", id: stripe.id });
          }
          return;
        }
        store.setSelection({ kind: "none" });
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (d.kind === "none") return;
        if (d.kind === "pan") {
          const dx = e.clientX - d.ox;
          const dy = e.clientY - d.oy;
          drag.current = { ...d, moved: d.moved || Math.hypot(dx, dy) > 3 };
          useRibbonStore.getState().setPan(d.startX + dx, d.startY + dy);
          return;
        }
        const { x, y } = toLocal(e.clientX, e.clientY);
        if (d.kind === "divider") {
          const edge = d.edge + (x - d.startX);
          useRibbonStore.getState().setColumnEdge(d.index, edge, e.shiftKey ? snap : 0);
        } else if (d.kind === "layer") {
          const dist = Math.hypot(x - d.ox, y - d.oy);
          if (dist > 0.6) {
            if (!d.captured) {
              useRibbonStore.getState().capture();
              drag.current = { ...d, captured: true, moved: true };
            } else {
              drag.current = { ...d, moved: true };
            }
          }
          const dx = (x - d.ox) / doc.width;
          const dy = (y - d.oy) / doc.height;
          if (xform === "rotate") {
            const ang =
              (Math.atan2(y - d.start[0].y * doc.height, x - d.start[0].x * doc.width) * 180) / Math.PI;
            useRibbonStore
              .getState()
              .updateLayers(d.ids, { rotation: e.shiftKey ? snapAng(ang, snap) : roundPx(ang, 0.1) });
            return;
          }
          useRibbonStore.getState().updateLayers(d.ids, (l) => {
            if (l.locked) return {};
            const st = d.start.find((s) => s.id === l.id);
            if (!st) return {};
            const nx = (st.x + dx) * doc.width;
            const ny = (st.y + dy) * doc.height;
            const px = e.shiftKey && snap > 0 ? snapValue(nx, snap) : roundPx(nx);
            const py = e.shiftKey && snap > 0 ? snapValue(ny, snap) : roundPx(ny);
            return { x: px / doc.width, y: py / doc.height };
          });
        } else if (d.kind === "resize") {
          const st = d.start;
          const cx = st.x * doc.width;
          const cy = st.y * doc.height;
          let w = st.w * doc.width;
          let h = st.h * doc.height;
          if (d.handle.includes("e")) w = Math.max(4, x - (cx - w / 2));
          if (d.handle.includes("w")) w = Math.max(4, cx + w / 2 - x);
          if (d.handle.includes("s")) h = Math.max(4, y - (cy - h / 2));
          if (d.handle.includes("n")) h = Math.max(4, cy + h / 2 - y);
          if (e.altKey) {
            const ratio = (st.w * doc.width) / Math.max(1, st.h * doc.height);
            h = w / ratio;
          }
          if (e.shiftKey && snap > 0) {
            w = Math.max(4, snapValue(w, snap));
            h = Math.max(4, snapValue(h, snap));
          } else {
            w = roundPx(w);
            h = roundPx(h);
          }
          useRibbonStore.getState().updateLayer(d.id, { w: w / doc.width, h: h / doc.height });
        } else if (d.kind === "rotate") {
          const ang = (Math.atan2(y - d.cy, x - d.cx) * 180) / Math.PI + 90;
          const next = e.shiftKey && snap > 0 ? snapAng(ang, snap) : roundPx(ang, 0.1);
          useRibbonStore.getState().updateLayer(d.id, { rotation: next });
        } else if (d.kind === "skew") {
          const dx = (x - d.ox) / doc.width;
          useRibbonStore.getState().updateLayer(d.id, { skewX: Math.max(-45, Math.min(45, d.start.skewX + dx * 60)) });
        } else if (d.kind === "marquee") {
          drag.current = { ...d, x2: x, y2: y };
        } else if (d.kind === "brush") {
          if (Math.hypot(x - d.lastX, y - d.lastY) < 0.6) return;
          const ctx = d.canvas.getContext("2d");
          if (!ctx) return;
          const over = d.canvas.width / doc.width;
          paintStroke(ctx, d.lastX, d.lastY, x, y, over, d.color);
          const src = d.canvas.toDataURL("image/png");
          void preloadImage(src).then(() => {
            useRibbonStore.getState().updateLayer(d.layerId, { src });
          });
          drag.current = { ...d, lastX: x, lastY: y };
        }
      }}
      onPointerUp={() => {
        const d = drag.current;
        if (d.kind === "pan") {
          if (!d.moved) useRibbonStore.getState().setSelection({ kind: "none" });
          setGrabbing(false);
        } else if (d.kind === "layer") {
          if (!d.moved && d.toggle) useRibbonStore.getState().setSelection({ kind: "none" });
        } else if (d.kind === "marquee") {
          const x1 = Math.min(d.x, d.x2);
          const x2 = Math.max(d.x, d.x2);
          const y1 = Math.min(d.y, d.y2);
          const y2 = Math.max(d.y, d.y2);
          const ids = doc.layers
            .filter((l) => {
              const cx = l.x * doc.width;
              const cy = l.y * doc.height;
              return cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2 && !l.locked;
            })
            .map((l) => l.id);
          useRibbonStore.getState().selectLayers(ids);
        }
        drag.current = { kind: "none" };
      }}
      onPointerCancel={() => {
        drag.current = { kind: "none" };
        setGrabbing(false);
      }}
      onAuxClick={(e) => e.preventDefault()}
    >
      <div
        className="absolute shrink-0"
        style={{
          left: `calc(50% + ${panX}px)`,
          top: `calc(50% + ${panY}px)`,
          width: cssW,
          height: cssH,
          transform: "translate(-50%, -50%)",
        }}
      >
        <canvas
          ref={canvasRef}
          className={cn("ribbon-shadow block rounded-[2px]", cursor)}
          style={{ width: cssW, height: cssH }}
        />
      </div>
      <Rulers
        wellW={well.w}
        wellH={well.h}
        originX={well.w / 2 + panX - cssW / 2}
        originY={well.h / 2 + panY - cssH / 2}
        zoom={zoom}
        docW={doc.width}
        docH={doc.height}
      />
    </div>
  );
}

function Rulers({
  wellW,
  wellH,
  originX,
  originY,
  zoom,
  docW,
  docH,
}: {
  wellW: number;
  wellH: number;
  originX: number;
  originY: number;
  zoom: number;
  docW: number;
  docH: number;
}) {
  const hRef = useRef<HTMLCanvasElement>(null);
  const vRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const h = hRef.current;
    const v = vRef.current;
    if (!h || !v || wellW < 1 || wellH < 1) return;
    paintRuler(h, "x", wellW, originX, zoom, docW);
    paintRuler(v, "y", wellH, originY, zoom, docH);
  }, [wellW, wellH, originX, originY, zoom, docW, docH]);
  if (wellW < 1) return null;
  return (
    <>
      <canvas ref={hRef} className="pointer-events-none absolute left-0 top-0 z-20" style={{ width: wellW, height: 18 }} />
      <canvas ref={vRef} className="pointer-events-none absolute left-0 top-0 z-20" style={{ width: 18, height: wellH }} />
      <div className="pointer-events-none absolute left-0 top-0 z-20 size-[18px] border-b border-r border-line bg-panel" />
    </>
  );
}

function rulerStep(zoom: number) {
  const px = 48 / Math.max(zoom, 0.25);
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
  return steps.find((s) => s >= px) ?? 500;
}

function paintRuler(
  canvas: HTMLCanvasElement,
  axis: "x" | "y",
  length: number,
  origin: number,
  zoom: number,
  span: number,
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const thick = 18;
  const w = axis === "x" ? length : thick;
  const h = axis === "x" ? thick : length;
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bg = "#1b2128";
  const spanFill = "rgba(232, 228, 220, 0.08)";
  const minor = "#aeb6bf";
  const majorInk = "#f3efe6";
  const edge = "#3d4752";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = spanFill;
  if (axis === "x") ctx.fillRect(origin, 0, span * zoom, thick);
  else ctx.fillRect(0, origin, thick, span * zoom);
  ctx.font = "10px IBM Plex Sans, ui-sans-serif, system-ui, sans-serif";
  ctx.lineWidth = 1;
  const step = rulerStep(zoom);
  const labelEvery = step >= 50 ? step : step * 5;
  const start = Math.floor(-origin / zoom / step) * step - step;
  const end = (length - origin) / zoom + step;
  for (let v = start; v <= end; v += step) {
    const p = origin + v * zoom;
    if (p < thick || p > length) continue;
    const major = Math.abs(v % labelEvery) < 0.01 || Math.abs((v % labelEvery) - labelEvery) < 0.01;
    ctx.strokeStyle = major ? majorInk : minor;
    ctx.beginPath();
    if (axis === "x") {
      ctx.moveTo(p + 0.5, major ? 2 : 10);
      ctx.lineTo(p + 0.5, thick);
    } else {
      ctx.moveTo(major ? 2 : 10, p + 0.5);
      ctx.lineTo(thick, p + 0.5);
    }
    ctx.stroke();
    if (!major) continue;
    ctx.fillStyle = majorInk;
    const label = String(Math.round(v));
    if (axis === "x") ctx.fillText(label, p + 3, 10);
    else {
      ctx.save();
      ctx.translate(11, p - 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "left";
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  }
  ctx.strokeStyle = edge;
  ctx.beginPath();
  if (axis === "x") {
    ctx.moveTo(0, thick - 0.5);
    ctx.lineTo(length, thick - 0.5);
  } else {
    ctx.moveTo(thick - 0.5, 0);
    ctx.lineTo(thick - 0.5, length);
  }
  ctx.stroke();
}

function paintStroke(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  over: number,
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 5 * over * 0.35;
  ctx.beginPath();
  ctx.moveTo(x1 * over, y1 * over);
  ctx.lineTo(x2 * over, y2 * over);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x2 * over, y2 * over, ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.fill();
}

function groupedIds(doc: RibbonDoc, id: string): string[] {
  const layer = doc.layers.find((l) => l.id === id);
  if (layer?.groupId)
    return doc.layers.filter((l) => l.groupId === layer.groupId && !l.locked).map((l) => l.id);
  return layer?.locked ? [] : [id];
}

function quant(n: number, step: number) {
  if (step <= 0) return Math.max(0, Math.min(1, n));
  return Math.max(0, Math.min(1, Math.round(n / step) * step));
}

function snapAng(ang: number, snap: number) {
  if (!snap) return ang;
  return Math.round(ang / 15) * 15;
}

function rgbHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function box(layer: Layer, doc: RibbonDoc) {
  const w = layer.w * doc.width;
  const h = layer.h * doc.height;
  return {
    x: layer.x * doc.width - w / 2,
    y: layer.y * doc.height - h / 2,
    w,
    h,
  };
}

function hitHandle(layer: Layer, doc: RibbonDoc, x: number, y: number, zoom: number): Handle | null {
  const b = box(layer, doc);
  const t = 8 / zoom;
  const pts: [Handle, number, number][] = [
    ["nw", b.x, b.y],
    ["n", b.x + b.w / 2, b.y],
    ["ne", b.x + b.w, b.y],
    ["e", b.x + b.w, b.y + b.h / 2],
    ["se", b.x + b.w, b.y + b.h],
    ["s", b.x + b.w / 2, b.y + b.h],
    ["sw", b.x, b.y + b.h],
    ["w", b.x, b.y + b.h / 2],
    ["rot", b.x + b.w / 2, b.y - 14 / zoom],
    ["skew", b.x + b.w + 10 / zoom, b.y + b.h / 2],
  ];
  for (const [name, hx, hy] of pts) {
    if (Math.abs(x - hx) <= t && Math.abs(y - hy) <= t) return name;
  }
  return null;
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  doc: RibbonDoc,
  scale: number,
  selection: Selection,
  selectedIds: string[],
  showGrid: boolean,
  showGuides: boolean,
  drag: Drag,
) {
  if (showGrid) drawStudioGrid(ctx, doc, scale, doc.grid ?? { color: "#d8d3c6", opacity: 0.45, adaptive: true, size: 1 });
  ctx.save();
  ctx.scale(scale, scale);
  if (showGuides) {
    ctx.strokeStyle = "rgba(216,211,198,0.28)";
    ctx.lineWidth = 1 / scale;
    ctx.setLineDash([4 / scale, 3 / scale]);
    ctx.beginPath();
    ctx.moveTo(doc.width / 2, 0);
    ctx.lineTo(doc.width / 2, doc.height);
    ctx.moveTo(0, doc.height / 2);
    ctx.lineTo(doc.width, doc.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const rows = layoutStripes(doc);
  ctx.fillStyle = "rgba(232,228,220,0.9)";
  for (let i = 0; i < rows.length - 1; i++) {
    const edge = rows[i].x + rows[i].w;
    ctx.fillRect(edge - 0.6, 0, 1.2, doc.height);
  }
  const ids = selectedIds.length
    ? selectedIds
    : selection.kind === "layer" && selection.id
      ? [selection.id]
      : [];
  for (const id of ids) {
    const layer = doc.layers.find((l) => l.id === id);
    if (!layer) continue;
    const b = box(layer, doc);
    ctx.strokeStyle = "#d8d3c6";
    ctx.lineWidth = 1.2 / scale;
    ctx.setLineDash([3 / scale, 2 / scale]);
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.setLineDash([]);
    const hs = [
      [b.x, b.y],
      [b.x + b.w / 2, b.y],
      [b.x + b.w, b.y],
      [b.x + b.w, b.y + b.h / 2],
      [b.x + b.w, b.y + b.h],
      [b.x + b.w / 2, b.y + b.h],
      [b.x, b.y + b.h],
      [b.x, b.y + b.h / 2],
    ];
    const s = 3.2 / scale;
    ctx.fillStyle = "#eceae4";
    for (const [hx, hy] of hs) ctx.fillRect(hx - s, hy - s, s * 2, s * 2);
    ctx.beginPath();
    ctx.moveTo(b.x + b.w / 2, b.y);
    ctx.lineTo(b.x + b.w / 2, b.y - 12 / scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.x + b.w / 2, b.y - 12 / scale, 3 / scale, 0, Math.PI * 2);
    ctx.fill();
  }
  if (selection.kind === "stripe" && selection.id) {
    const row = rows.find((r) => r.stripe.id === selection.id);
    if (row) {
      ctx.strokeStyle = "#d8d3c6";
      ctx.lineWidth = 1.4 / scale;
      ctx.strokeRect(row.x + 0.5, 0.5, row.w - 1, doc.height - 1);
    }
  }
  if (drag.kind === "marquee") {
    ctx.strokeStyle = "#d8d3c6";
    ctx.setLineDash([3 / scale, 2 / scale]);
    ctx.strokeRect(drag.x, drag.y, drag.x2 - drag.x, drag.y2 - drag.y);
  }
  ctx.restore();
}
