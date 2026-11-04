import { drawIcon } from "./icons";
import type {
  Finish,
  GridSpec,
  Layer,
  OverlayKind,
  RibbonDoc,
  ShapeLayer,
  Stripe,
  Texture,
} from "./types";

export type RenderOptions = {
  scale?: number;
  checker?: boolean;
  pixelSnap?: boolean;
  quality?: "crisp" | "smooth";
};

function totalWeight(stripes: Stripe[]): number {
  return stripes.reduce((n, s) => n + Math.max(0.0001, s.weight), 0);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.padEnd(6, "0").slice(0, 6);
  const n = parseInt(v, 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = (c: number) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  return `rgb(${t(r)}, ${t(g)}, ${t(b)})`;
}

export function stripeLayout(doc: RibbonDoc): { stripe: Stripe; x: number; w: number }[] {
  const sum = totalWeight(doc.stripes);
  let x = 0;
  return doc.stripes.map((stripe) => {
    const w = (stripe.weight / sum) * doc.width;
    const row = { stripe, x, w };
    x += w;
    return row;
  });
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let n = Math.imul(s ^ (s >>> 15), 1 | s);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function fillSatin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  texture: Texture,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  if (texture.satin > 0) {
    const rib = Math.max(0.9, h / 24);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    for (let i = 0; i < h + rib; i += rib) {
      const odd = Math.floor(i / rib) % 2 === 0;
      ctx.fillStyle = odd
        ? `rgba(255,255,255,${0.075 * texture.satin})`
        : `rgba(0,0,0,${0.09 * texture.satin})`;
      ctx.fillRect(x, y + i, w, rib * 0.52);
    }
    ctx.restore();
  }
  if (texture.sheen > 0) {
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, `rgba(0,0,0,${0.28 * texture.sheen})`);
    g.addColorStop(0.22, `rgba(255,255,255,${0.04 * texture.sheen})`);
    g.addColorStop(0.5, `rgba(255,255,255,${0.2 * texture.sheen})`);
    g.addColorStop(0.78, `rgba(255,255,255,${0.04 * texture.sheen})`);
    g.addColorStop(1, `rgba(0,0,0,${0.32 * texture.sheen})`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
}

function drawHash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  a: string,
  b: string,
  scale = 1,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const period = Math.max(2.2, Math.min(10, w * 0.55) * Math.max(0.25, scale));
  ctx.lineWidth = period * 0.48;
  ctx.lineCap = "butt";
  let i = 0;
  for (let px = -h; px < w + h; px += period) {
    ctx.beginPath();
    ctx.moveTo(x + px, y);
    ctx.lineTo(x + px + h, y + h);
    ctx.strokeStyle = i % 2 === 0 ? a : b;
    ctx.stroke();
    i += 1;
  }
  ctx.restore();
}

function drawMetal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  cool = 0,
) {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, shade(color, -0.35));
  g.addColorStop(0.18, shade(color, 0.22 + cool * 0.1));
  g.addColorStop(0.5, shade(color, 0.08));
  g.addColorStop(0.82, shade(color, 0.34));
  g.addColorStop(1, shade(color, -0.4));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function drawPiping(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  pipe: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  const t = Math.max(1, w * 0.18);
  ctx.fillStyle = pipe;
  ctx.fillRect(x, y, t, h);
  ctx.fillRect(x + w - t, y, t, h);
}

function noiseRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  amt: number,
  seed: number,
) {
  const rand = seeded(seed);
  const step = Math.max(1, Math.round(Math.min(w, h) / 28));
  for (let py = y; py < y + h; py += step) {
    for (let px = x; px < x + w; px += step) {
      const n = (rand() - 0.5) * amt;
      ctx.fillStyle = n > 0 ? `rgba(255,255,255,${n})` : `rgba(0,0,0,${-n})`;
      ctx.fillRect(px, py, step, step);
    }
  }
}

export function paintFinish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  finish: Finish,
  texture: Texture,
  alt = "#C8A84B",
  pipe = "#F4F1EA",
  scale = 1,
  seed = 1,
  rotation = 0,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (rotation) {
    const pad = Math.hypot(w, h);
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-(x + w / 2), -(y + h / 2));
    x = x + w / 2 - pad;
    y = y + h / 2 - pad;
    w = pad * 2;
    h = pad * 2;
  }
  switch (finish) {
    case "hash":
      drawHash(ctx, x, y, w, h, alt, color, scale);
      break;
    case "metal":
      drawMetal(ctx, x, y, w, h, color);
      break;
    case "chrome":
      drawMetal(ctx, x, y, w, h, color, 1);
      {
        const g = ctx.createLinearGradient(x, y, x + w, y);
        g.addColorStop(0.45, "rgba(255,255,255,0)");
        g.addColorStop(0.52, "rgba(255,255,255,0.55)");
        g.addColorStop(0.58, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
      }
      break;
    case "brass":
      drawMetal(ctx, x, y, w, h, color);
      ctx.fillStyle = "rgba(255, 210, 80, 0.12)";
      ctx.fillRect(x, y, w, h);
      break;
    case "piping":
      drawPiping(ctx, x, y, w, h, color, pipe);
      break;
    case "satin":
      fillSatin(ctx, x, y, w, h, color, texture);
      break;
    case "matte":
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      noiseRect(ctx, x, y, w, h, 0.12, seed);
      break;
    case "gloss":
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      {
        const g = ctx.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0, "rgba(255,255,255,0.45)");
        g.addColorStop(0.35, "rgba(255,255,255,0.05)");
        g.addColorStop(1, "rgba(0,0,0,0.28)");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
      }
      break;
    case "enamel":
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath();
      ctx.ellipse(x + w * 0.5, y + h * 0.32, w * 0.38, h * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "velvet": {
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, shade(color, -0.18));
      g.addColorStop(0.5, color);
      g.addColorStop(1, shade(color, -0.28));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      break;
    }
    case "felt":
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      noiseRect(ctx, x, y, w, h, 0.22, seed);
      break;
    case "leather":
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      {
        const rand = seeded(seed);
        ctx.strokeStyle = "rgba(0,0,0,0.18)";
        ctx.lineWidth = Math.max(0.6, h * 0.03);
        for (let i = 0; i < 8; i++) {
          ctx.beginPath();
          ctx.moveTo(x, y + rand() * h);
          ctx.quadraticCurveTo(x + w * 0.5, y + rand() * h, x + w, y + rand() * h);
          ctx.stroke();
        }
      }
      break;
    case "foil":
      drawMetal(ctx, x, y, w, h, color);
      {
        const g = ctx.createLinearGradient(x, y, x + w, y + h);
        g.addColorStop(0, "rgba(255,255,255,0.0)");
        g.addColorStop(0.4, "rgba(255,230,140,0.28)");
        g.addColorStop(0.7, "rgba(255,255,255,0.12)");
        g.addColorStop(1, "rgba(0,0,0,0.15)");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
      }
      break;
    case "embroidered":
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = shade(color, -0.25);
      ctx.lineWidth = Math.max(0.5, 0.9 * scale);
      for (let py = y + 2; py < y + h; py += 3.2 * scale) {
        ctx.beginPath();
        ctx.moveTo(x, py);
        ctx.lineTo(x + w, py);
        ctx.stroke();
      }
      break;
    case "carbon": {
      ctx.fillStyle = shade(color, -0.1);
      ctx.fillRect(x, y, w, h);
      const p = Math.max(3, 5 * scale);
      for (let i = -h; i < w + h; i += p) {
        ctx.fillStyle = i % (p * 2) < p ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.12)";
        ctx.fillRect(x + i, y, p * 0.55, h);
      }
      break;
    }
    case "glow":
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.shadowColor = color;
      ctx.shadowBlur = h * 0.4;
      ctx.fillStyle = shade(color, 0.2);
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.shadowBlur = 0;
      break;
    case "worn":
      fillSatin(ctx, x, y, w, h, color, { ...texture, sheen: texture.sheen * 0.3 });
      paintOverlay(ctx, x, y, w, h, "scratches", 0.45, seed);
      paintOverlay(ctx, x, y, w, h, "dirt", 0.2, seed + 3);
      break;
    default:
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

function paintOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: OverlayKind,
  amount: number,
  seed: number,
) {
  if (kind === "none" || amount <= 0) return;
  const rand = seeded(seed);
  const a = Math.max(0, Math.min(1, amount));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (kind === "scratches") {
    ctx.strokeStyle = `rgba(255,255,255,${0.35 * a})`;
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 14 * a + 4; i++) {
      ctx.beginPath();
      const px = x + rand() * w;
      const py = y + rand() * h;
      ctx.moveTo(px, py);
      ctx.lineTo(px + (rand() - 0.2) * w * 0.4, py + (rand() - 0.5) * 8);
      ctx.stroke();
    }
  } else if (kind === "dirt" || kind === "dust") {
    for (let i = 0; i < 40 * a; i++) {
      ctx.fillStyle = `rgba(40,30,18,${0.18 * a})`;
      ctx.beginPath();
      ctx.arc(x + rand() * w, y + rand() * h, 1 + rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "mud") {
    for (let i = 0; i < 10 * a; i++) {
      ctx.fillStyle = `rgba(62,42,20,${0.35 * a})`;
      ctx.beginPath();
      ctx.ellipse(
        x + rand() * w,
        y + h * (0.55 + rand() * 0.45),
        6 + rand() * 14,
        3 + rand() * 7,
        rand() * 0.6,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  } else if (kind === "damage") {
    ctx.fillStyle = `rgba(0,0,0,${0.35 * a})`;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(x + rand() * w, y + rand() * h);
      ctx.lineTo(x + rand() * w, y + rand() * h);
      ctx.lineTo(x + rand() * w, y + rand() * h);
      ctx.closePath();
      ctx.fill();
    }
  } else if (kind === "torn") {
    ctx.fillStyle = `rgba(10,10,12,${0.85 * a})`;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    let px = x;
    while (px < x + w) {
      px += 4 + rand() * 8;
      ctx.lineTo(px, y + h - rand() * h * 0.35 * a);
    }
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "sparkle") {
    ctx.fillStyle = `rgba(255,255,240,${0.7 * a})`;
    for (let i = 0; i < 18 * a; i++) {
      const px = x + rand() * w;
      const py = y + rand() * h;
      ctx.fillRect(px, py, 1.4, 1.4);
    }
  } else if (kind === "wet") {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, `rgba(255,255,255,${0.28 * a})`);
    g.addColorStop(0.5, `rgba(255,255,255,0)`);
    g.addColorStop(1, `rgba(0,0,0,${0.18 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  } else if (kind === "rust") {
    for (let i = 0; i < 16 * a; i++) {
      ctx.fillStyle = `rgba(140,60,20,${0.28 * a})`;
      ctx.beginPath();
      ctx.arc(x + rand() * w, y + rand() * h, 2 + rand() * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawStripes(ctx: CanvasRenderingContext2D, doc: RibbonDoc) {
  const rows = stripeLayout(doc);
  for (const { stripe, x, w } of rows) {
    const reps = Math.max(1, Math.round(stripe.repeat || 1));
    const band = w / reps;
    if (stripe.visible === false) continue;
    for (let i = 0; i < reps; i++) {
      const color = i % 2 === 0 ? stripe.color : stripe.hashColor || stripe.color;
      paintFinish(
        ctx,
        x + i * band,
        0,
        band,
        doc.height,
        color,
        stripe.finish,
        doc.texture,
        stripe.hashColor,
        stripe.pipingColor,
        stripe.scale || 1,
        hashSeed(stripe.id + String(i)),
        stripe.rotation || 0,
      );
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function shapePath(ctx: CanvasRenderingContext2D, layer: ShapeLayer) {
  const { w, h, kind, corner, innerRatio } = layer;
  const x = -w / 2;
  const y = -h / 2;
  if (kind === "rect") {
    roundRect(ctx, x, y, w, h, corner);
  } else if (kind === "circle") {
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (kind === "triangle") {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  } else if (kind === "diamond") {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(x + w, 0);
    ctx.lineTo(0, y + h);
    ctx.lineTo(x, 0);
    ctx.closePath();
  } else if (kind === "hexagon") {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = Math.cos(a) * (w / 2);
      const py = Math.sin(a) * (h / 2);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (kind === "star") {
    ctx.beginPath();
    const n = 5;
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? 0.5 : 0.2;
      const a = (i * Math.PI) / n - Math.PI / 2;
      const px = Math.cos(a) * w * r;
      const py = Math.sin(a) * h * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (kind === "ring") {
    const outer = Math.min(w, h) / 2;
    const inner = outer * Math.max(0.15, Math.min(0.92, innerRatio));
    ctx.beginPath();
    ctx.arc(0, 0, outer, 0, Math.PI * 2);
    ctx.arc(0, 0, inner, 0, Math.PI * 2, true);
  } else if (kind === "tube") {
    const r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, 0, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, 0, r, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
  }
}

function drawUnit(ctx: CanvasRenderingContext2D, doc: RibbonDoc, layer: Layer, w: number, h: number) {
  if (layer.type === "shape") {
    shapePath(ctx, { ...layer, w, h } as ShapeLayer);
    ctx.fillStyle = layer.fill;
    ctx.fill("evenodd");
    if (layer.strokeWidth > 0) {
      ctx.strokeStyle = layer.stroke;
      ctx.lineWidth = layer.strokeWidth;
      ctx.stroke();
    }
  } else if (layer.type === "icon") {
    ctx.save();
    ctx.scale(w, h);
    drawIcon(ctx, layer.iconId, layer.fill, layer.stroke);
    ctx.restore();
  } else if (layer.type === "text") {
    ctx.fillStyle = layer.fill;
    ctx.font = `${layer.weight} ${Math.max(8, h)}px "${layer.font || "IBM Plex Sans"}", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(layer.text, 0, 0, w);
  } else if (layer.type === "image" && layer.src) {
    const img = imageCache.get(layer.src);
    if (img) ctx.drawImage(img, -w / 2, -h / 2, w, h);
  }
}

function paintLayer(ctx: CanvasRenderingContext2D, doc: RibbonDoc, layer: Layer) {
  if (!layer.visible) return;
  const cx = layer.x * doc.width;
  const cy = layer.y * doc.height;
  const w = layer.w * doc.width;
  const h = layer.h * doc.height;
  const nx = Math.max(1, Math.round(layer.repeatX || 1));
  const ny = Math.max(1, Math.round(layer.repeatY || 1));
  const gap = layer.repeatGap ?? 0.08;
  ctx.save();
  ctx.globalAlpha *= layer.opacity;
  ctx.globalCompositeOperation = layer.blend;
  ctx.translate(cx, cy);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.transform(1, Math.tan(((layer.skewY || 0) * Math.PI) / 180), Math.tan(((layer.skewX || 0) * Math.PI) / 180), 1, 0, 0);
  if (layer.flipX) ctx.scale(-1, 1);
  if (layer.flipY) ctx.scale(1, -1);

  const cellW = nx === 1 ? w : w / (nx + (nx - 1) * gap);
  const cellH = ny === 1 ? h : h / (ny + (ny - 1) * gap);
  const totalW = nx * cellW + (nx - 1) * cellW * gap;
  const totalH = ny * cellH + (ny - 1) * cellH * gap;
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const ox = -totalW / 2 + cellW / 2 + ix * cellW * (1 + gap);
      const oy = -totalH / 2 + cellH / 2 + iy * cellH * (1 + gap);
      ctx.save();
      ctx.translate(ox, oy);
      drawUnit(ctx, doc, layer, cellW, cellH);
      ctx.restore();
    }
  }

  if (layer.finish && layer.finish !== "flat") {
    paintFinish(
      ctx,
      -w / 2,
      -h / 2,
      w,
      h,
      layer.fill,
      layer.finish,
      doc.texture,
      layer.stroke,
      layer.stroke,
      1,
      hashSeed(layer.id),
    );
  }
  if (layer.overlay && layer.overlay !== "none") {
    paintOverlay(ctx, -w / 2, -h / 2, w, h, layer.overlay, layer.overlayAmount ?? 0.4, hashSeed(layer.id + "ov"));
  }
  ctx.restore();
}

const imageCache = new Map<string, HTMLImageElement>();
const imageWaiters = new Map<string, Promise<HTMLImageElement>>();

export function preloadImage(src: string): Promise<HTMLImageElement> {
  const hit = imageCache.get(src);
  if (hit) return Promise.resolve(hit);
  const pending = imageWaiters.get(src);
  if (pending) return pending;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
  imageWaiters.set(src, p);
  return p;
}

function grain(ctx: CanvasRenderingContext2D, doc: RibbonDoc) {
  if (doc.texture.grain <= 0) return;
  const t = ctx.getTransform();
  const width = Math.max(1, Math.round(doc.width * t.a));
  const height = Math.max(1, Math.round(doc.height * t.d));
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const id = ctx.getImageData(0, 0, width, height);
  const d = id.data;
  const amt = doc.texture.grain * 28;
  const rand = seeded(hashSeed(doc.id + doc.name));
  for (let i = 0; i < d.length; i += 4) {
    const noise = (rand() - 0.5) * amt;
    d[i] = Math.max(0, Math.min(255, d[i] + noise));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + noise));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + noise));
  }
  ctx.putImageData(id, 0, 0);
  ctx.restore();
}

function bevel(ctx: CanvasRenderingContext2D, doc: RibbonDoc) {
  const { width: w, height: h, texture } = doc;
  if (texture.bevel <= 0) return;
  const t = Math.max(1, Math.round(h * 0.06 * texture.bevel));
  const g1 = ctx.createLinearGradient(0, 0, 0, t * 3);
  g1.addColorStop(0, `rgba(255,255,255,${0.42 * texture.bevel})`);
  g1.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, w, t * 3);
  const g2 = ctx.createLinearGradient(0, h, 0, h - t * 3);
  g2.addColorStop(0, `rgba(0,0,0,${0.45 * texture.bevel})`);
  g2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, h - t * 3, w, t * 3);
}

function border(ctx: CanvasRenderingContext2D, doc: RibbonDoc) {
  if (doc.texture.border <= 0) return;
  ctx.strokeStyle = doc.texture.borderColor;
  ctx.lineWidth = doc.texture.border;
  ctx.strokeRect(
    doc.texture.border / 2,
    doc.texture.border / 2,
    doc.width - doc.texture.border,
    doc.height - doc.texture.border,
  );
}

function posterize(ctx: CanvasRenderingContext2D, doc: RibbonDoc) {
  if (!doc.flatten.enabled) return;
  const { width, height } = doc;
  const id = ctx.getImageData(0, 0, width, height);
  const d = id.data;
  if (doc.flatten.snapPalette) {
    const palette: [number, number, number][] = [];
    for (const s of doc.stripes) palette.push(hexToRgb(s.color), hexToRgb(s.hashColor));
    for (const l of doc.layers) palette.push(hexToRgb(l.fill), hexToRgb(l.stroke));
    palette.push(hexToRgb(doc.texture.borderColor));
    for (let i = 0; i < d.length; i += 4) {
      let best = 0;
      let dist = Infinity;
      for (let p = 0; p < palette.length; p++) {
        const [r, g, b] = palette[p];
        const dd = (d[i] - r) ** 2 + (d[i + 1] - g) ** 2 + (d[i + 2] - b) ** 2;
        if (dd < dist) {
          dist = dd;
          best = p;
        }
      }
      const [r, g, b] = palette[best];
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
  } else {
    const levels = Math.max(2, doc.flatten.levels);
    const step = 255 / (levels - 1);
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.round(d[i] / step) * step;
      d[i + 1] = Math.round(d[i + 1] / step) * step;
      d[i + 2] = Math.round(d[i + 2] / step) * step;
    }
  }
  ctx.putImageData(id, 0, 0);
}

export function renderRibbon(ctx: CanvasRenderingContext2D, doc: RibbonDoc, options: RenderOptions = {}) {
  const scale = options.scale ?? 1;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = options.quality !== "crisp";
  if (options.quality === "smooth") {
    ctx.imageSmoothingQuality = "high";
  }
  if (options.checker) {
    const cell = 8;
    for (let y = 0; y < doc.height; y += cell) {
      for (let x = 0; x < doc.width; x += cell) {
        ctx.fillStyle = (x / cell + y / cell) % 2 === 0 ? "#d8d5cc" : "#eeeae2";
        ctx.fillRect(x, y, cell, cell);
      }
    }
  } else {
    ctx.clearRect(0, 0, doc.width, doc.height);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, doc.width, doc.height);
  ctx.clip();
  drawStripes(ctx, doc);
  for (const layer of doc.layers) paintLayer(ctx, doc, layer);
  bevel(ctx, doc);
  if (doc.texture.grain > 0) grain(ctx, doc);
  if (doc.wear && doc.wear.kind !== "none" && doc.wear.amount > 0) {
    paintOverlay(ctx, 0, 0, doc.width, doc.height, doc.wear.kind, doc.wear.amount, 90210);
  }
  posterize(ctx, doc);
  ctx.restore();
  border(ctx, doc);
  ctx.restore();
}

export function layoutStripes(doc: RibbonDoc) {
  return stripeLayout(doc);
}

export function hitStripe(doc: RibbonDoc, x: number): Stripe | undefined {
  return stripeLayout(doc).find((r) => x >= r.x && x < r.x + r.w)?.stripe;
}

export function hitDivider(doc: RibbonDoc, x: number, slop: number): number | null {
  const rows = stripeLayout(doc);
  for (let i = 0; i < rows.length - 1; i++) {
    const edge = rows[i].x + rows[i].w;
    if (rows[i].stripe.locked || rows[i + 1].stripe.locked) continue;
    if (Math.abs(x - edge) <= slop) return i;
  }
  return null;
}

export function hitLayer(doc: RibbonDoc, x: number, y: number): Layer | undefined {
  for (let i = doc.layers.length - 1; i >= 0; i--) {
    const layer = doc.layers[i];
    if (!layer.visible || layer.locked) continue;
    const cx = layer.x * doc.width;
    const cy = layer.y * doc.height;
    const w = layer.w * doc.width;
    const h = layer.h * doc.height;
    const dx = x - cx;
    const dy = y - cy;
    const rad = (-layer.rotation * Math.PI) / 180;
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
    if (Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2) return layer;
  }
  return undefined;
}

export function collectPalette(doc: RibbonDoc): string[] {
  const set = new Set<string>();
  for (const s of doc.stripes) {
    set.add(s.color.toUpperCase());
    set.add(s.hashColor.toUpperCase());
  }
  for (const l of doc.layers) {
    set.add(l.fill.toUpperCase());
    set.add(l.stroke.toUpperCase());
  }
  return [...set];
}

export function contrastGridColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.45 ? "#1a1c22" : "#f4f1ea";
}

export function drawStudioGrid(
  ctx: CanvasRenderingContext2D,
  doc: RibbonDoc,
  scale: number,
  grid: GridSpec,
) {
  const size = Math.max(1, grid.size || 1);
  ctx.save();
  ctx.scale(scale, scale);
  if (grid.adaptive) {
    ctx.globalCompositeOperation = "difference";
    ctx.strokeStyle = `rgba(255,255,255,${grid.opacity})`;
  } else {
    ctx.strokeStyle = grid.color;
    ctx.globalAlpha = grid.opacity;
  }
  ctx.lineWidth = 1 / scale;
  for (let x = 0; x <= doc.width; x += size) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, doc.height);
    ctx.stroke();
  }
  ctx.restore();
}
