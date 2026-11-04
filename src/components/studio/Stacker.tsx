import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { download, exportPng, slug } from "@/lib/ribbon/export";
import type { RibbonDoc } from "@/lib/ribbon/types";
import { Trash2 } from "lucide-react";

const KEY = "merit-press-stack";
const MAX = 5;

type Piece = { id: string; name: string; src: string; x: number; y: number; w: number; h: number };

function loadCache(): { gap: number; pieces: Piece[] } {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") as {
      gap?: number;
      pieces?: Piece[];
    } | null;
    const pieces = Array.isArray(raw?.pieces)
      ? raw.pieces.filter(validPiece).slice(0, MAX)
      : [];
    const gap = Number.isFinite(raw?.gap) ? Number(raw?.gap) : 8;
    return { gap, pieces };
  } catch {
    return { gap: 8, pieces: [] };
  }
}

function validPiece(p: Partial<Piece>): p is Piece {
  return (
    !!p &&
    typeof p.id === "string" &&
    typeof p.src === "string" &&
    typeof p.name === "string" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    Number.isFinite(p.w) &&
    Number.isFinite(p.h)
  );
}

function measure(src: string) {
  return new Promise<{ w: number; h: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

function snapNear(value: number, targets: number[], threshold: number) {
  let best = value;
  let dist = threshold;
  for (const t of targets) {
    const d = Math.abs(value - t);
    if (d <= dist) {
      dist = d;
      best = t;
    }
  }
  return best;
}

export function Stacker({ doc }: { doc: RibbonDoc }) {
  const initial = useRef(loadCache());
  const [pieces, setPieces] = useState<Piece[]>(initial.current.pieces);
  const [gap, setGap] = useState(initial.current.gap);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ gap, pieces }));
      setNote("");
    } catch {
      setNote("This stack stays in the tab. The browser cache is full.");
    }
  }, [gap, pieces]);

  async function addPiece(name: string, src: string) {
    if (pieces.length >= MAX) return;
    const size = await measure(src).catch(() => ({ w: doc.width, h: doc.height }));
    setPieces((prev) => {
      if (prev.length >= MAX) return prev;
      const y = prev.reduce((m, p) => Math.max(m, p.y + p.h + gap), 0);
      return [...prev, { id: crypto.randomUUID(), name, src, x: 0, y, w: size.w, h: size.h }];
    });
  }

  function align() {
    const ordered = [...pieces].sort((a, b) => a.y - b.y || a.x - b.x);
    const width = Math.max(1, ...ordered.map((p) => p.w));
    let y = 0;
    const next = ordered.map((p) => {
      const row = { ...p, x: (width - p.w) / 2, y };
      y += p.h + gap;
      return row;
    });
    setPieces(next);
  }

  function onDrag(e: ReactPointerEvent<HTMLImageElement>, id: string) {
    if (e.button !== 0) return;
    const piece = pieces.find((p) => p.id === id);
    if (!piece) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const origin = { x: piece.x, y: piece.y, px: e.clientX, py: e.clientY, w: piece.w, h: piece.h };
    const others = pieces.filter((p) => p.id !== id);
    const move = (ev: PointerEvent) => {
      let x = origin.x + (ev.clientX - origin.px);
      let y = origin.y + (ev.clientY - origin.py);
      if (ev.shiftKey) {
        const xs = [0];
        const ys = [0];
        for (const o of others) {
          xs.push(o.x, o.x + o.w - origin.w, o.x + (o.w - origin.w) / 2);
          ys.push(o.y, o.y + o.h + gap, o.y - origin.h - gap);
        }
        x = snapNear(x, xs, 8);
        y = snapNear(y, ys, 8);
      }
      setPieces((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)));
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  }

  async function savePng() {
    if (!pieces.length) return;
    const minX = Math.min(...pieces.map((p) => p.x));
    const minY = Math.min(...pieces.map((p) => p.y));
    const maxX = Math.max(...pieces.map((p) => p.x + p.w));
    const maxY = Math.max(...pieces.map((p) => p.y + p.h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(maxX - minX));
    canvas.height = Math.max(1, Math.ceil(maxY - minY));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const loaded = await Promise.all(
      pieces.map(async (p) => ({ p, img: await measureImage(p.src) })),
    );
    for (const { p, img } of loaded) {
      if (!img) continue;
      ctx.drawImage(img, p.x - minX, p.y - minY, p.w, p.h);
    }
    download(`${slug(doc.name)}-stack.png`, canvas.toDataURL("image/png"));
  }

  const minX = pieces.length ? Math.min(0, ...pieces.map((p) => p.x)) : 0;
  const minY = pieces.length ? Math.min(0, ...pieces.map((p) => p.y)) : 0;
  const maxX = pieces.length ? Math.max(280, ...pieces.map((p) => p.x + p.w)) : 280;
  const maxY = pieces.length ? Math.max(120, ...pieces.map((p) => p.y + p.h)) : 120;

  return (
    <div className="grid gap-3">
      <div className="grid content-start gap-2">
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            disabled={pieces.length >= MAX}
            onClick={() => void addPiece(doc.name, exportPng(doc, 2, "smooth"))}
          >
            Add this ribbon
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={pieces.length >= MAX}
            onClick={() => fileRef.current?.click()}
          >
            Upload
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const src = await readFile(file);
              await addPiece(file.name.replace(/\.[^.]+$/, ""), src);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="secondary" disabled={pieces.length < 2} onClick={align}>
            Align stack
          </Button>
          <Button size="sm" disabled={!pieces.length} onClick={() => void savePng()}>
            Save PNG
          </Button>
          <Button size="sm" variant="ghost" disabled={!pieces.length} onClick={() => setPieces([])}>
            Clear
          </Button>
        </div>
        <Field label="Gap">
          <Input
            type="number"
            min={0}
            step={1}
            value={gap}
            onChange={(e) => setGap(Math.max(0, Number(e.target.value) || 0))}
          />
        </Field>
        <ul className="grid gap-1">
          {pieces.length === 0 && (
            <li className="text-xs text-subtle">Nothing cached. Add the ribbon on the press, or upload up to five images.</li>
          )}
          {pieces.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <img src={p.src} alt="" className="h-6 w-14 rounded-[4px] border border-border object-contain bg-inset" />
              <span className="min-w-0 flex-1 truncate text-xs text-muted">{p.name}</span>
              <button
                type="button"
                title="Remove"
                className="text-subtle hover:text-fg"
                onClick={() => setPieces((prev) => prev.filter((x) => x.id !== p.id))}
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <p className="text-[11px] leading-relaxed text-subtle">
          Drag to place. Hold Shift to snap edges. {pieces.length}/{MAX} cached in this browser.
        </p>
        {note && <p className="text-[11px] text-subtle">{note}</p>}
      </div>
      <div className="overflow-auto rounded-[10px] border border-border bg-inset">
        <div className="relative" style={{ width: maxX - minX + 16, height: maxY - minY + 16 }}>
          {pieces.map((p) => (
            <img
              key={p.id}
              src={p.src}
              alt={p.name}
              draggable={false}
              onPointerDown={(e) => onDrag(e, p.id)}
              className="absolute cursor-grab touch-none select-none active:cursor-grabbing"
              style={{
                left: p.x - minX + 8,
                top: p.y - minY + 8,
                width: p.w,
                height: p.h,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function measureImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
