import type { Layer, RibbonDoc, Stripe } from "./types";

export const PX_STEP = 0.01;

export function roundPx(n: number, step = PX_STEP): number {
  if (!Number.isFinite(n)) return 0;
  if (step <= 0) return n;
  const decimals = Math.max(0, Math.min(8, Math.ceil(-Math.log10(step) - 1e-12)));
  const r = Math.round(n / step) * step;
  return Number(r.toFixed(decimals));
}

export function fmtPx(n: number): string {
  const r = roundPx(n);
  if (Math.abs(r - Math.round(r)) < PX_STEP / 2) return String(Math.round(r));
  return r.toFixed(2);
}

export function snapValue(n: number, snap: number): number {
  if (!snap || snap <= 0) return roundPx(n);
  return roundPx(Math.round(n / snap) * snap, snap < 1 ? PX_STEP : snap);
}

/** Next snap increment in `dir` (+/−). Already on-grid moves one step. */
export function snapToward(n: number, snap: number, dir: number): number {
  if (!dir) return roundPx(n);
  if (!snap || snap <= 0) return roundPx(n + (dir > 0 ? 1 : -1));
  const eps = Math.max(PX_STEP, snap * 1e-6);
  if (dir > 0) return roundPx(Math.ceil((n + eps) / snap) * snap);
  return roundPx(Math.floor((n - eps) / snap) * snap);
}

export type Column = {
  stripe: Stripe;
  index: number;
  x: number;
  w: number;
  left: number;
  right: number;
};

export function columnsOf(doc: RibbonDoc): Column[] {
  const sum = doc.stripes.reduce((n, s) => n + Math.max(0.0001, s.weight), 0);
  let x = 0;
  return doc.stripes.map((stripe, index) => {
    const w = (Math.max(0.0001, stripe.weight) / sum) * doc.width;
    const col = { stripe, index, x, w, left: x, right: x + w };
    x += w;
    return col;
  });
}

export function widthsToWeights(widths: number[]): number[] {
  return widths.map((w) => Math.max(0.25, roundPx(w)));
}

export function applyMirrorWeights(
  stripes: Stripe[],
  leftIndex: number,
  leftW: number,
  rightW: number,
): Stripe[] {
  const n = stripes.length;
  const pi = n - 1 - leftIndex;
  const pj = n - 2 - leftIndex;
  if (pi === leftIndex || pj === leftIndex + 1 || pi < 0 || pj < 0) return stripes;
  if (new Set([leftIndex, leftIndex + 1, pi, pj]).size < 4) return stripes;
  return stripes.map((s, i) => {
    if (i === pi) return { ...s, weight: Math.max(0.25, leftW) };
    if (i === pj) return { ...s, weight: Math.max(0.25, rightW) };
    return s;
  });
}

export function setEdgePx(doc: RibbonDoc, index: number, edge: number, snap = 0): Stripe[] {
  const cols = columnsOf(doc);
  if (index < 0 || index >= cols.length - 1) return doc.stripes;
  if (cols[index].stripe.locked || cols[index + 1].stripe.locked) return doc.stripes;
  const min = cols[index].left + 0.25;
  const max = cols[index + 1].right - 0.25;
  let e = Math.max(min, Math.min(max, edge));
  if (snap > 0) e = Math.max(min, Math.min(max, snapValue(e, snap)));
  else e = roundPx(e);
  const widths = cols.map((c) => c.w);
  widths[index] = e - cols[index].left;
  widths[index + 1] = cols[index + 1].right - e;
  let next = doc.stripes.map((s, i) => ({ ...s, weight: widthsToWeights(widths)[i] }));
  if (doc.mirrorColumns) next = applyMirrorWeights(next, index, next[index].weight, next[index + 1].weight);
  return next;
}

export function setWidthPx(doc: RibbonDoc, id: string, widthPx: number, snap = 0): Stripe[] {
  const cols = columnsOf(doc);
  const i = cols.findIndex((c) => c.stripe.id === id);
  if (i < 0) return doc.stripes;
  const neighbor = i < cols.length - 1 ? i + 1 : i - 1;
  if (neighbor < 0) return doc.stripes;
  if (cols[i].stripe.locked || cols[neighbor].stripe.locked) return doc.stripes;
  const pool = cols[i].w + cols[neighbor].w;
  let w = Math.max(0.25, Math.min(pool - 0.25, widthPx));
  if (snap > 0) w = Math.max(0.25, Math.min(pool - 0.25, snapValue(w, snap)));
  else w = roundPx(w);
  const widths = cols.map((c) => c.w);
  const delta = w - widths[i];
  widths[i] = w;
  widths[neighbor] = Math.max(0.25, widths[neighbor] - delta);
  const weights = widthsToWeights(widths);
  let next = doc.stripes.map((s, idx) => ({ ...s, weight: weights[idx] }));
  const leftIndex = Math.min(i, neighbor);
  if (doc.mirrorColumns) {
    next = applyMirrorWeights(next, leftIndex, next[leftIndex].weight, next[leftIndex + 1].weight);
  }
  return next;
}

export function defaultLayerName(layer: Layer): string {
  if (layer.type === "shape") return layer.kind;
  if (layer.type === "icon") return layer.iconId;
  if (layer.type === "text") return "Text";
  return "Image";
}

export function defaultStripeName(s: Stripe): string {
  if (s.finish && s.finish !== "flat") return s.finish;
  return "Stripe";
}

export function layerKindLabel(layer: Layer): string {
  if (layer.type === "shape") return "shape";
  if (layer.type === "icon") return "device";
  if (layer.type === "text") return "text";
  return "image";
}
