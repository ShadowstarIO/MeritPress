import { drawIcon } from "./icons";
import { renderRibbon } from "./render";
import { uid } from "./ids";
import { normalizeLayer, normalizeStripe } from "./templates";
import {
  DEFAULT_GRID,
  DEFAULT_RACK,
  DEFAULT_TEXTURE,
  DEFAULT_WEAR,
  FINISHES,
  OVERLAYS,
  SHAPES,
  type Finish,
  type IconLayer,
  type Layer,
  type OverlayKind,
  type RibbonDoc,
  type ShapeKind,
  type ShapeLayer,
  type Stripe,
  type TextLayer,
} from "./types";

export function renderToCanvas(
  doc: RibbonDoc,
  scale = 1,
  quality: "crisp" | "smooth" = "smooth",
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(doc.width * scale));
  canvas.height = Math.max(1, Math.round(doc.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = quality === "smooth";
  ctx.imageSmoothingQuality = "high";
  renderRibbon(ctx, doc, { scale, pixelSnap: quality === "crisp", quality });
  return canvas;
}

function downsample(
  src: HTMLCanvasElement,
  width: number,
  height: number,
  smooth: boolean,
): HTMLCanvasElement {
  let cur = src;
  let w = src.width;
  let h = src.height;
  if (smooth) {
    while (w / 2 >= width && h / 2 >= height) {
      const next = document.createElement("canvas");
      next.width = Math.max(1, Math.round(w / 2));
      next.height = Math.max(1, Math.round(h / 2));
      const ctx = next.getContext("2d");
      if (!ctx) break;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(cur, 0, 0, next.width, next.height);
      cur = next;
      w = next.width;
      h = next.height;
    }
  }
  const out = document.createElement("canvas");
  out.width = Math.max(1, width);
  out.height = Math.max(1, height);
  const ctx = out.getContext("2d");
  if (!ctx) return cur;
  ctx.imageSmoothingEnabled = smooth;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(cur, 0, 0, out.width, out.height);
  return out;
}

export function exportPng(
  doc: RibbonDoc,
  scale = 1,
  quality: "crisp" | "smooth" = "smooth",
): string {
  const over = Math.max(8, scale * 2);
  const hi = renderToCanvas(doc, over, quality);
  const w = Math.round(doc.width * scale);
  const h = Math.round(doc.height * scale);
  if (hi.width === w && hi.height === h) return hi.toDataURL("image/png");
  return downsample(hi, w, h, quality === "smooth").toDataURL("image/png");
}

export function exportRackPng(
  doc: RibbonDoc,
  scale = 1,
  quality: "crisp" | "smooth" = "smooth",
): string {
  const cols = Math.max(1, Math.min(12, Math.round(doc.rack?.cols ?? 1)));
  const rows = Math.max(1, Math.min(12, Math.round(doc.rack?.rows ?? 1)));
  const gap = Math.max(0, doc.rack?.gap ?? 6);
  const cell = renderToCanvas(doc, Math.max(scale, 8), quality);
  const cellW = Math.round(doc.width * scale);
  const cellH = Math.round(doc.height * scale);
  const gapPx = Math.round(gap * scale);
  const out = document.createElement("canvas");
  out.width = Math.max(1, cols * cellW + (cols - 1) * gapPx);
  out.height = Math.max(1, rows * cellH + (rows - 1) * gapPx);
  const ctx = out.getContext("2d");
  if (!ctx) return cell.toDataURL("image/png");
  ctx.imageSmoothingEnabled = quality === "smooth";
  ctx.imageSmoothingQuality = "high";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * (cellW + gapPx);
      const y = r * (cellH + gapPx);
      ctx.drawImage(cell, 0, 0, cell.width, cell.height, x, y, cellW, cellH);
    }
  }
  return out.toDataURL("image/png");
}

function svgEscape(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "\u0026amp;";
      case "<":
        return "\u0026lt;";
      case ">":
        return "\u0026gt;";
      case '"':
        return "\u0026quot;";
      default:
        return "\u0026#39;";
    }
  });
}

function stripeRects(doc: RibbonDoc) {
  const sum = doc.stripes.reduce((n, s) => n + s.weight, 0);
  let x = 0;
  return doc.stripes.map((s) => {
    const w = (s.weight / sum) * doc.width;
    const r = { s, x, w };
    x += w;
    return r;
  });
}

function rasterIcon(layer: IconLayer, w: number, h: number): string {
  const canvas = document.createElement("canvas");
  const over = 8;
  canvas.width = Math.max(8, Math.round(Math.abs(w) * over));
  canvas.height = Math.max(8, Math.round(Math.abs(h) * over));
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(canvas.width, canvas.height);
  drawIcon(ctx, layer.iconId, layer.fill, layer.stroke || layer.fill);
  return canvas.toDataURL("image/png");
}

function layerSvg(doc: RibbonDoc, layer: Layer): string {
  if (!layer.visible) return "";
  const cx = layer.x * doc.width;
  const cy = layer.y * doc.height;
  const w = layer.w * doc.width;
  const h = layer.h * doc.height;
  const sx = layer.flipX ? -1 : 1;
  const sy = layer.flipY ? -1 : 1;
  const t = `translate(${cx} ${cy}) rotate(${layer.rotation}) scale(${sx} ${sy})`;
  const op = layer.opacity < 1 ? ` opacity="${layer.opacity}"` : "";
  if (layer.type === "shape") {
    const d = shapeD(layer, w, h);
    return `<path transform="${t}" d="${d}" fill="${layer.fill}" stroke="${layer.stroke}" stroke-width="${layer.strokeWidth}" fill-rule="evenodd"${op}/>`;
  }
  if (layer.type === "text") {
    return `<text transform="${t}" fill="${layer.fill}" font-size="${h}" font-family="IBM Plex Sans, sans-serif" font-weight="${layer.weight}" text-anchor="middle" dominant-baseline="middle"${op}>${svgEscape(layer.text)}</text>`;
  }
  if (layer.type === "image") {
    return `<image transform="${t}" href="${svgEscape(layer.src)}" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}"${op}/>`;
  }
  const href = rasterIcon(layer, w, h);
  return `<image transform="${t}" href="${href}" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}"${op}/>`;
}

function shapeD(layer: ShapeLayer, w: number, h: number): string {
  const x = -w / 2;
  const y = -h / 2;
  switch (layer.kind) {
    case "circle":
      return `M ${w / 2} 0 A ${w / 2} ${h / 2} 0 1 0 ${-w / 2} 0 A ${w / 2} ${h / 2} 0 1 0 ${w / 2} 0`;
    case "triangle":
      return `M 0 ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
    case "diamond":
      return `M 0 ${y} L ${x + w} 0 L 0 ${y + h} L ${x} 0 Z`;
    case "hexagon": {
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        pts.push(`${Math.cos(a) * (w / 2)} ${Math.sin(a) * (h / 2)}`);
      }
      return `M ${pts.join(" L ")} Z`;
    }
    case "star": {
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 0.5 : 0.2;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        pts.push(`${Math.cos(a) * w * r} ${Math.sin(a) * h * r}`);
      }
      return `M ${pts.join(" L ")} Z`;
    }
    case "ring": {
      const o = Math.min(w, h) / 2;
      const i = o * layer.innerRatio;
      return `M ${o} 0 A ${o} ${o} 0 1 0 ${-o} 0 A ${o} ${o} 0 1 0 ${o} 0 M ${i} 0 A ${i} ${i} 0 1 1 ${-i} 0 A ${i} ${i} 0 1 1 ${i} 0`;
    }
    case "tube": {
      const r = h / 2;
      return `M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
    }
    default:
      return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
  }
}

export function exportSvg(doc: RibbonDoc): string {
  const hi = renderToCanvas(doc, 8, "smooth");
  const href = hi.toDataURL("image/png");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">
  <title>${svgEscape(doc.name)}</title>
  <image href="${href}" width="${doc.width}" height="${doc.height}" image-rendering="optimizeQuality"/>
</svg>`;
}

export function exportSvgVector(doc: RibbonDoc): string {
  const rects = stripeRects(doc)
    .map(
      ({ s, x, w }) =>
        `<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${doc.height}" fill="${s.color}"/>`,
    )
    .join("");
  const layers = doc.layers.map((l) => layerSvg(doc, l)).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">
  <title>${svgEscape(doc.name)}</title>
  ${rects}
  ${layers}
</svg>`;
}

export function exportJson(doc: RibbonDoc): string {
  return JSON.stringify(doc, null, 2);
}

export type MeritKind = "meritpress-save" | "meritpress-template";

export function packMerit(doc: RibbonDoc, kind: MeritKind): string {
  return JSON.stringify({ version: 1, kind, doc }, null, 2);
}

export function parseMeritFile(raw: unknown): { doc: RibbonDoc; kind: MeritKind } | null {
  if (!raw || typeof raw !== "object") return null;
  const file = raw as { kind?: unknown; doc?: unknown };
  const wrapped = file.kind === "meritpress-save" || file.kind === "meritpress-template";
  const doc = parseRibbonDoc(wrapped ? file.doc : raw);
  if (!doc) return null;
  return { doc, kind: file.kind === "meritpress-template" ? "meritpress-template" : "meritpress-save" };
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

const FINISH_IDS = new Set(FINISHES.map((f) => f.id));
const OVERLAY_IDS = new Set(OVERLAYS.map((f) => f.id));

function parseStripe(raw: unknown): Stripe {
  const s = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return normalizeStripe({
    id: str(s.id, uid("st")),
    weight: Math.max(0.25, num(s.weight, 10)),
    color: str(s.color, "#F4F1EA"),
    finish: FINISH_IDS.has(s.finish as Finish) ? (s.finish as Finish) : "flat",
    hashColor: str(s.hashColor, "#C8A84B"),
    pipingColor: str(s.pipingColor, "#F4F1EA"),
    repeat: Math.max(1, num(s.repeat, 1)),
    scale: Math.max(0.25, num(s.scale, 1)),
    rotation: num(s.rotation, 0),
    name: str(s.name, "Stripe"),
    visible: s.visible !== false,
    locked: Boolean(s.locked),
  });
}

function parseLayer(raw: unknown): Layer | null {
  if (!raw || typeof raw !== "object") return null;
  const l = raw as Record<string, unknown>;
  const base = {
    id: str(l.id, uid("ly")),
    name: str(l.name, "layer"),
    x: num(l.x, 0.5),
    y: num(l.y, 0.5),
    w: num(l.w, 0.18),
    h: num(l.h, 0.62),
    rotation: num(l.rotation, 0),
    skewX: num(l.skewX, 0),
    skewY: num(l.skewY, 0),
    opacity: Math.max(0, Math.min(1, num(l.opacity, 1))),
    blend: (typeof l.blend === "string" ? l.blend : "source-over") as Layer["blend"],
    visible: l.visible !== false,
    locked: Boolean(l.locked),
    fill: str(l.fill, "#E8D48A"),
    stroke: str(l.stroke, "#8A6A22"),
    strokeWidth: num(l.strokeWidth, 0),
    flipX: Boolean(l.flipX),
    flipY: Boolean(l.flipY),
    groupId: typeof l.groupId === "string" ? l.groupId : null,
    finish: FINISH_IDS.has(l.finish as Finish) ? (l.finish as Finish) : "flat",
    overlay: OVERLAY_IDS.has(l.overlay as OverlayKind) ? (l.overlay as OverlayKind) : "none",
    overlayAmount: num(l.overlayAmount, 0.4),
    repeatX: Math.max(1, num(l.repeatX, 1)),
    repeatY: Math.max(1, num(l.repeatY, 1)),
    repeatGap: num(l.repeatGap, 0.08),
  };
  if (l.type === "icon") return normalizeLayer({ ...base, type: "icon", iconId: str(l.iconId, "star") });
  if (l.type === "text") {
    return normalizeLayer({
      ...base,
      type: "text",
      text: str(l.text, ""),
      font: str(l.font, "IBM Plex Sans"),
      weight: num((l as TextLayer).weight, 600),
    });
  }
  if (l.type === "image") return normalizeLayer({ ...base, type: "image", src: str(l.src, "") });
  const kind = SHAPES.includes(l.kind as ShapeKind) ? (l.kind as ShapeKind) : "rect";
  return normalizeLayer({
    ...base,
    type: "shape",
    kind,
    corner: num(l.corner, 2),
    innerRatio: num(l.innerRatio, 0.62),
  });
}

export function parseRibbonDoc(raw: unknown): RibbonDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.width !== "number" || typeof d.height !== "number") return null;
  if (!Array.isArray(d.stripes) || d.stripes.length < 1) return null;
  const layers = Array.isArray(d.layers)
    ? (d.layers.map(parseLayer).filter(Boolean) as Layer[])
    : [];
  const texture =
    d.texture && typeof d.texture === "object"
      ? { ...DEFAULT_TEXTURE, ...(d.texture as object) }
      : { ...DEFAULT_TEXTURE };
  const flatten =
    d.flatten && typeof d.flatten === "object"
      ? {
          enabled: Boolean((d.flatten as { enabled?: boolean }).enabled),
          levels: num((d.flatten as { levels?: number }).levels, 12),
          snapPalette: (d.flatten as { snapPalette?: boolean }).snapPalette !== false,
        }
      : { enabled: false, levels: 12, snapPalette: true };
  const rack =
    d.rack && typeof d.rack === "object"
      ? {
          cols: Math.max(1, num((d.rack as { cols?: number }).cols, 1)),
          rows: Math.max(1, num((d.rack as { rows?: number }).rows, 1)),
          gap: Math.max(0, num((d.rack as { gap?: number }).gap, 6)),
        }
      : { ...DEFAULT_RACK };
  const grid =
    d.grid && typeof d.grid === "object"
      ? { ...DEFAULT_GRID, ...(d.grid as object) }
      : { ...DEFAULT_GRID };
  const wearRaw = d.wear && typeof d.wear === "object" ? (d.wear as { kind?: unknown; amount?: unknown }) : null;
  const wear = {
    kind: OVERLAY_IDS.has(wearRaw?.kind as OverlayKind) ? (wearRaw?.kind as OverlayKind) : DEFAULT_WEAR.kind,
    amount:
      typeof wearRaw?.amount === "number" && Number.isFinite(wearRaw.amount)
        ? Math.min(1, Math.max(0, wearRaw.amount))
        : DEFAULT_WEAR.amount,
  };
  return {
    id: str(d.id, uid("rb")),
    name: str(d.name, "Imported bar"),
    width: Math.max(8, Math.min(2400, d.width)),
    height: Math.max(8, Math.min(800, d.height)),
    stripes: d.stripes.map(parseStripe),
    layers,
    texture,
    wear,
    flatten,
    rack,
    grid,
    mirrorColumns: Boolean(d.mirrorColumns),
  };
}

export function download(filename: string, href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  download(filename, url);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "ribbon"
  );
}
