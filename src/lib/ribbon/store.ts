import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "./ids";
import { blankRibbon, builtInTemplates, cloneDoc, inspectorRibbon, normalizeLayer, normalizeStripe } from "./templates";
import { DEFAULT_GRID, DEFAULT_RACK, DEFAULT_TEXTURE, DEFAULT_WEAR, OVERLAYS } from "./types";
import { applyMirrorWeights, roundPx, setEdgePx, setWidthPx, snapToward } from "./columns";
import type {
  Finish,
  Layer,
  OverlayKind,
  RibbonDoc,
  SavedProject,
  Selection,
  ShapeKind,
  Stripe,
  Tool,
  UserPalette,
  XformMode,
} from "./types";

type Align = "left" | "center" | "right" | "top" | "middle" | "bottom" | "bar-center";

type State = {
  docs: RibbonDoc[];
  activeId: string;
  selection: Selection;
  selectedIds: string[];
  zoom: number;
  panX: number;
  panY: number;
  snap: number;
  showGrid: boolean;
  showGuides: boolean;
  tool: Tool;
  xform: XformMode;
  currentColor: string;
  recentColors: string[];
  past: RibbonDoc[];
  future: RibbonDoc[];
  clipboard: Layer[];
  saves: SavedProject[];
  userTemplates: SavedProject[];
  palettes: UserPalette[];
  ready: boolean;
  spaceHeld: boolean;
};

type Actions = {
  hydrate: () => void;
  capture: () => void;
  undo: () => void;
  redo: () => void;
  setActive: (id: string) => void;
  newBlank: (w?: number, h?: number) => void;
  loadTemplate: (id: string) => void;
  duplicateDoc: () => void;
  removeDoc: (id: string) => void;
  importDoc: (doc: RibbonDoc) => void;
  updateDoc: (patch: Partial<RibbonDoc>) => void;
  setSize: (width: number, height: number) => void;
  setSelection: (selection: Selection, additive?: boolean) => void;
  selectLayers: (ids: string[]) => void;
  selectAll: () => void;
  setZoom: (zoom: number) => void;
  zoomAt: (zoom: number, originX: number, originY: number, wellW: number, wellH: number) => void;
  setPan: (panX: number, panY: number) => void;
  panBy: (dx: number, dy: number) => void;
  fitZoom: (availW: number, availH: number) => void;
  setSpaceHeld: (held: boolean) => void;
  setSnap: (snap: number) => void;
  toggleGrid: () => void;
  toggleGuides: () => void;
  setTool: (tool: Tool) => void;
  setXform: (xform: XformMode) => void;
  setCurrentColor: (hex: string) => void;
  addStripe: (afterId?: string) => void;
  removeStripe: (id: string) => void;
  updateStripe: (id: string, patch: Partial<Stripe>) => void;
  moveStripe: (id: string, dir: -1 | 1) => void;
  duplicateStripe: (id: string) => void;
  equalizeStripes: () => void;
  mirrorStripes: () => void;
  splitStripe: (id: string) => void;
  resizeDivider: (leftId: string, rightId: string, leftW: number, rightW: number) => void;
  setColumnEdge: (index: number, edgePx: number, snap?: number) => void;
  setColumnWidth: (id: string, widthPx: number, snap?: number) => void;
  reorderStripe: (id: string, toIndex: number) => void;
  reorderLayer: (id: string, toIndex: number) => void;
  addShape: (kind: ShapeKind) => void;
  addIcon: (iconId: string) => void;
  addText: (text?: string) => void;
  addImage: (src: string) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  updateLayers: (ids: string[], patch: Partial<Layer> | ((l: Layer) => Partial<Layer>)) => void;
  removeLayer: (id: string) => void;
  removeSelected: () => void;
  duplicateLayer: (id: string) => void;
  duplicateSelected: () => void;
  nudgeSelected: (dx: number, dy: number, snapGrid?: number) => void;
  rotateSelected: (deg: number) => void;
  bring: (id: string, dir: "up" | "down" | "top" | "bottom") => void;
  align: (how: Align) => void;
  distribute: (axis: "x" | "y") => void;
  flipSelected: (axis: "x" | "y") => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  copySelected: () => void;
  paste: () => void;
  applySample: (hex: string) => void;
  fillAt: (kind: "stripe" | "layer", id: string) => void;
  smartSnap: () => void;
  saveNamed: (name?: string) => void;
  loadSave: (id: string) => void;
  removeSave: (id: string) => void;
  keepTemplate: (name?: string) => void;
  loadUserTemplate: (id: string) => void;
  removeUserTemplate: (id: string) => void;
  addPalette: (name: string, colors: string[]) => void;
  updatePalette: (id: string, patch: Partial<UserPalette>) => void;
  removePalette: (id: string) => void;
};

function patchActive(docs: RibbonDoc[], id: string, fn: (d: RibbonDoc) => RibbonDoc) {
  return docs.map((d) => (d.id === id ? fn(d) : d));
}

function rememberColor(recent: string[] | undefined, hex: string) {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return recent ?? [];
  const key = hex.toUpperCase();
  return [hex, ...(recent ?? []).filter((c) => c.toUpperCase() !== key)].slice(0, 12);
}

function normalizeDoc(d: RibbonDoc): RibbonDoc {
  return {
    ...d,
    rack: d.rack ?? { ...DEFAULT_RACK },
    grid: d.grid ?? { ...DEFAULT_GRID },
    texture: { ...DEFAULT_TEXTURE, ...(d.texture ?? {}) },
    wear: {
      kind: OVERLAYS.some((o) => o.id === d.wear?.kind) ? d.wear.kind : DEFAULT_WEAR.kind,
      amount:
        typeof d.wear?.amount === "number" && Number.isFinite(d.wear.amount)
          ? Math.min(1, Math.max(0, d.wear.amount))
          : DEFAULT_WEAR.amount,
    },
    flatten: d.flatten ?? { enabled: false, levels: 12, snapPalette: true },
    mirrorColumns: Boolean(d.mirrorColumns),
    stripes: (d.stripes ?? []).map((s) => normalizeStripe(s)),
    layers: (d.layers ?? []).map((l) => normalizeLayer(l)),
  };
}

const layerBase = () => ({
  id: uid("ly"),
  x: 0.5,
  y: 0.5,
  w: 0.18,
  h: 0.62,
  rotation: 0,
  skewX: 0,
  skewY: 0,
  opacity: 1,
  blend: "source-over" as const,
  visible: true,
  locked: false,
  fill: "#E8D48A",
  stroke: "#8A6A22",
  strokeWidth: 0,
  flipX: false,
  flipY: false,
  groupId: null as string | null,
  finish: "flat" as Finish,
  overlay: "none" as OverlayKind,
  overlayAmount: 0.4,
  repeatX: 1,
  repeatY: 1,
  repeatGap: 0.08,
});

function cloneLayer(src: Layer, dx = 0.04): Layer {
  return { ...structuredClone(src), id: uid("ly"), x: src.x + dx, name: src.name };
}

export const useRibbonStore = create<State & Actions>()(
  persist(
    (set, get) => {
      const activeDoc = () => {
        const s = get();
        return s.docs.find((d) => d.id === s.activeId) ?? s.docs[0];
      };

      const snapNow = () => {
        const doc = activeDoc();
        if (!doc) return;
        set((s) => ({ past: [...s.past, structuredClone(doc)].slice(-80), future: [] }));
      };

      const mutate = (fn: (d: RibbonDoc) => RibbonDoc, extra?: Partial<State>) => {
        const s = get();
        set({
          docs: patchActive(s.docs, s.activeId, fn),
          ...extra,
        });
      };

      return {
        docs: [inspectorRibbon()],
        activeId: inspectorRibbon().id,
        selection: { kind: "none" },
        selectedIds: [],
        zoom: 3,
        panX: 0,
        panY: 0,
        snap: 1,
        showGrid: true,
        showGuides: true,
        tool: "select",
        xform: "move",
        currentColor: "#E8D48A",
        recentColors: [],
        past: [],
        future: [],
        clipboard: [],
        saves: [],
        userTemplates: [],
        palettes: [],
        ready: false,
        spaceHeld: false,

        hydrate: () => {
          const s = get();
          if (!s.docs.length) {
            const first = inspectorRibbon();
            set({ docs: [first], activeId: first.id, ready: true });
            return;
          }
          const docs = s.docs.map(normalizeDoc);
          const active = docs.find((d) => d.id === s.activeId) ?? docs[0];
          set({ docs, activeId: active.id, ready: true });
        },

        capture: snapNow,

        undo: () => {
          const s = get();
          const prev = s.past.at(-1);
          const cur = activeDoc();
          if (!prev || !cur) return;
          set({
            past: s.past.slice(0, -1),
            future: [...s.future, structuredClone(cur)].slice(-80),
            docs: patchActive(s.docs, s.activeId, () => structuredClone(prev)),
          });
        },

        redo: () => {
          const s = get();
          const next = s.future.at(-1);
          const cur = activeDoc();
          if (!next || !cur) return;
          set({
            future: s.future.slice(0, -1),
            past: [...s.past, structuredClone(cur)].slice(-80),
            docs: patchActive(s.docs, s.activeId, () => structuredClone(next)),
          });
        },

        setActive: (id) =>
          set({
            activeId: id,
            selection: { kind: "none" },
            selectedIds: [],
            past: [],
            future: [],
            panX: 0,
            panY: 0,
          }),

        newBlank: (w = 236, h = 66) => {
          const d = cloneDoc(blankRibbon(w, h), "Untitled bar");
          set((s) => ({
            docs: [d, ...s.docs],
            activeId: d.id,
            selection: { kind: "none" },
            selectedIds: [],
            past: [],
            future: [],
            panX: 0,
            panY: 0,
          }));
        },

        loadTemplate: (id) => {
          const t = builtInTemplates().find((d) => d.id === id || d.name === id);
          const src = t ?? builtInTemplates()[0];
          const d = cloneDoc(src, src.name);
          const idNow = get().activeId;
          d.id = idNow;
          set((s) => ({
            docs: s.docs.some((x) => x.id === idNow)
              ? s.docs.map((x) => (x.id === idNow ? d : x))
              : [d],
            activeId: d.id,
            selection: { kind: "none" },
            selectedIds: [],
            past: [],
            future: [],
            panX: 0,
            panY: 0,
          }));
        },

        duplicateDoc: () => {
          const src = activeDoc();
          if (!src) return;
          const d = cloneDoc(src, `${src.name} copy`);
          set((s) => ({
            docs: [d, ...s.docs],
            activeId: d.id,
            past: [],
            future: [],
            panX: 0,
            panY: 0,
          }));
        },

        removeDoc: (id) =>
          set((s) => {
            const docs = s.docs.filter((d) => d.id !== id);
            const next = docs[0] ?? inspectorRibbon();
            const list = docs.length ? docs : [next];
            return { docs: list, activeId: list[0].id, selection: { kind: "none" }, selectedIds: [] };
          }),

        importDoc: (doc) => {
          const d = cloneDoc(normalizeDoc(doc), doc.name);
          const idNow = get().activeId;
          d.id = idNow;
          set((s) => ({
            docs: s.docs.some((x) => x.id === idNow)
              ? s.docs.map((x) => (x.id === idNow ? d : x))
              : [d],
            activeId: d.id,
            selection: { kind: "none" },
            selectedIds: [],
            past: [],
            future: [],
            panX: 0,
            panY: 0,
          }));
        },

        updateDoc: (patch) => mutate((d) => ({ ...d, ...patch })),
        setSize: (width, height) => mutate((d) => ({ ...d, width, height })),

        setSelection: (selection, additive = false) =>
          set((s) => {
            if (selection.kind === "layer") {
              const ids = additive
                ? s.selectedIds.includes(selection.id)
                  ? s.selectedIds.filter((id) => id !== selection.id)
                  : [...s.selectedIds, selection.id]
                : [selection.id];
              return { selection: { kind: "layer", id: ids.at(-1) ?? selection.id }, selectedIds: ids };
            }
            return { selection, selectedIds: [] };
          }),

        selectLayers: (ids) =>
          set({
            selectedIds: ids,
            selection: ids.length ? { kind: "layer", id: ids[0] } : { kind: "none" },
          }),

        selectAll: () => {
          const d = activeDoc();
          if (!d) return;
          const ids = d.layers.filter((l) => !l.locked).map((l) => l.id);
          set({
            selectedIds: ids,
            selection: ids.length ? { kind: "layer", id: ids[0] } : { kind: "none" },
          });
        },

        setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(48, zoom)) }),
        zoomAt: (zoom, originX, originY, wellW, wellH) => {
          const s = get();
          const z = Math.max(0.25, Math.min(48, zoom));
          const factor = z / Math.max(0.0001, s.zoom);
          const dx = originX - (wellW / 2 + s.panX);
          const dy = originY - (wellH / 2 + s.panY);
          set({
            zoom: z,
            panX: s.panX + dx * (1 - factor),
            panY: s.panY + dy * (1 - factor),
          });
        },
        setPan: (panX, panY) => set({ panX, panY }),
        panBy: (dx, dy) => set((s) => ({ panX: s.panX + dx, panY: s.panY + dy })),
        fitZoom: (availW, availH) => {
          const d = activeDoc();
          if (!d) return;
          const z = Math.max(
            0.25,
            Math.min(8, Math.min((availW - 48) / d.width, (availH - 48) / d.height)),
          );
          set({ zoom: z, panX: 0, panY: 0 });
        },
        setSpaceHeld: (spaceHeld) => set({ spaceHeld }),
        setSnap: (snap) => set({ snap: Math.max(0, snap) }),
        toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
        toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),
        setTool: (tool) => set({ tool }),
        setXform: (xform) => set({ xform }),
        setCurrentColor: (hex) =>
          set((s) => ({ currentColor: hex, recentColors: rememberColor(s.recentColors, hex) })),

        addStripe: (afterId) => {
          snapNow();
          mutate((d) => {
            const next: Stripe = normalizeStripe({
              color: get().currentColor || "#F4F1EA",
              weight: 12,
            });
            const i = d.stripes.findIndex((st) => st.id === afterId);
            const stripes = [...d.stripes];
            stripes.splice(i >= 0 ? i + 1 : stripes.length, 0, next);
            return { ...d, stripes };
          });
        },

        removeStripe: (id) => {
          snapNow();
          const s = get();
          mutate(
            (d) => ({
              ...d,
              stripes: d.stripes.length <= 1 ? d.stripes : d.stripes.filter((st) => st.id !== id),
            }),
            s.selection.kind === "stripe" && s.selection.id === id
              ? { selection: { kind: "none" } }
              : undefined,
          );
        },

        updateStripe: (id, patch) =>
          mutate((d) => ({
            ...d,
            stripes: d.stripes.map((st) => (st.id === id ? { ...st, ...patch } : st)),
          })),

        moveStripe: (id, dir) => {
          snapNow();
          mutate((d) => {
            const i = d.stripes.findIndex((st) => st.id === id);
            const j = i + dir;
            if (i < 0 || j < 0 || j >= d.stripes.length) return d;
            const stripes = [...d.stripes];
            const [row] = stripes.splice(i, 1);
            stripes.splice(j, 0, row);
            return { ...d, stripes };
          });
        },

        duplicateStripe: (id) => {
          snapNow();
          mutate((d) => {
            const i = d.stripes.findIndex((st) => st.id === id);
            if (i < 0) return d;
            const copy = { ...d.stripes[i], id: uid("st") };
            const stripes = [...d.stripes];
            stripes.splice(i + 1, 0, copy);
            return { ...d, stripes };
          });
        },

        equalizeStripes: () => {
          snapNow();
          mutate((d) => ({
            ...d,
            stripes: d.stripes.map((st) => ({ ...st, weight: 10 })),
          }));
        },

        mirrorStripes: () => {
          snapNow();
          mutate((d) => ({ ...d, stripes: [...d.stripes].reverse() }));
        },

        splitStripe: (id) => {
          snapNow();
          mutate((d) => {
            const i = d.stripes.findIndex((st) => st.id === id);
            if (i < 0) return d;
            const src = d.stripes[i];
            const a = { ...src, weight: src.weight / 2 };
            const b = { ...src, id: uid("st"), weight: src.weight / 2 };
            const stripes = [...d.stripes];
            stripes.splice(i, 1, a, b);
            return { ...d, stripes };
          });
        },

        resizeDivider: (leftId, rightId, leftW, rightW) =>
          mutate((d) => {
            const i = d.stripes.findIndex((st) => st.id === leftId);
            let stripes = d.stripes.map((st) => {
              if (st.id === leftId) return { ...st, weight: Math.max(0.25, leftW) };
              if (st.id === rightId) return { ...st, weight: Math.max(0.25, rightW) };
              return st;
            });
            if (d.mirrorColumns && i >= 0) {
              stripes = applyMirrorWeights(stripes, i, Math.max(0.25, leftW), Math.max(0.25, rightW));
            }
            return { ...d, stripes };
          }),

        setColumnEdge: (index, edgePx, snap = 0) =>
          mutate((d) => ({ ...d, stripes: setEdgePx(d, index, edgePx, snap) })),

        setColumnWidth: (id, widthPx, snap = 0) =>
          mutate((d) => ({ ...d, stripes: setWidthPx(d, id, widthPx, snap) })),

        reorderStripe: (id, toIndex) => {
          snapNow();
          mutate((d) => {
            const from = d.stripes.findIndex((st) => st.id === id);
            if (from < 0) return d;
            const stripes = [...d.stripes];
            const [row] = stripes.splice(from, 1);
            let dest = toIndex;
            if (from < dest) dest -= 1;
            dest = Math.max(0, Math.min(stripes.length, dest));
            stripes.splice(dest, 0, row);
            return { ...d, stripes };
          });
        },

        reorderLayer: (id, toIndex) => {
          snapNow();
          mutate((d) => {
            const from = d.layers.findIndex((l) => l.id === id);
            if (from < 0) return d;
            const layers = [...d.layers];
            const [row] = layers.splice(from, 1);
            let dest = toIndex;
            if (from < dest) dest -= 1;
            dest = Math.max(0, Math.min(layers.length, dest));
            layers.splice(dest, 0, row);
            return { ...d, layers };
          });
        },

        addShape: (kind) => {
          snapNow();
          const layer: Layer = {
            ...layerBase(),
            type: "shape",
            name: kind,
            kind,
            corner: 2,
            innerRatio: 0.62,
            fill: get().currentColor,
            stroke: "#E8D48A",
            strokeWidth: 1.2,
            w: kind === "tube" ? 0.4 : 0.16,
            h: kind === "tube" ? 0.28 : 0.55,
          };
          mutate((d) => ({ ...d, layers: [...d.layers, layer] }), {
            selection: { kind: "layer", id: layer.id },
            selectedIds: [layer.id],
          });
        },

        addIcon: (iconId) => {
          snapNow();
          const layer: Layer = {
            ...layerBase(),
            type: "icon",
            name: iconId,
            iconId,
            fill: get().currentColor,
          };
          mutate((d) => ({ ...d, layers: [...d.layers, layer] }), {
            selection: { kind: "layer", id: layer.id },
            selectedIds: [layer.id],
          });
        },

        addText: (text = "LSPD") => {
          snapNow();
          const layer: Layer = {
            ...layerBase(),
            type: "text",
            name: text.length < 8 ? text : "Text",
            text,
            font: "IBM Plex Sans",
            weight: 600,
            w: 0.4,
            h: 0.28,
            fill: get().currentColor,
          };
          mutate((d) => ({ ...d, layers: [...d.layers, layer] }), {
            selection: { kind: "layer", id: layer.id },
            selectedIds: [layer.id],
          });
        },

        addImage: (src) => {
          snapNow();
          const layer: Layer = {
            ...layerBase(),
            type: "image",
            name: "Image",
            src,
            w: 0.28,
            h: 0.7,
            fill: "#ffffff",
            stroke: "#000000",
          };
          mutate((d) => ({ ...d, layers: [...d.layers, layer] }), {
            selection: { kind: "layer", id: layer.id },
            selectedIds: [layer.id],
          });
        },

        updateLayer: (id, patch) =>
          mutate((d) => ({
            ...d,
            layers: d.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)),
          })),

        updateLayers: (ids, patch) =>
          mutate((d) => ({
            ...d,
            layers: d.layers.map((l) => {
              if (!ids.includes(l.id)) return l;
              const p = typeof patch === "function" ? patch(l) : patch;
              return { ...l, ...p } as Layer;
            }),
          })),

        removeLayer: (id) => {
          snapNow();
          const s = get();
          mutate(
            (d) => ({ ...d, layers: d.layers.filter((l) => l.id !== id) }),
            {
              selectedIds: s.selectedIds.filter((x) => x !== id),
              selection:
                s.selection.kind === "layer" && s.selection.id === id ? { kind: "none" } : s.selection,
            },
          );
        },

        removeSelected: () => {
          const s = get();
          const d = activeDoc();
          if (s.selection.kind === "stripe") {
            const stripeId = s.selection.id;
            const st = d?.stripes.find((x) => x.id === stripeId);
            if (st?.locked) return;
            get().removeStripe(stripeId);
            return;
          }
          const ids = s.selectedIds.filter((id) => !d?.layers.find((l) => l.id === id)?.locked);
          if (!ids.length) return;
          snapNow();
          mutate((doc) => ({ ...doc, layers: doc.layers.filter((l) => !ids.includes(l.id)) }), {
            selectedIds: [],
            selection: { kind: "none" },
          });
        },

        duplicateLayer: (id) => {
          snapNow();
          let copyId = "";
          mutate((d) => {
            const src = d.layers.find((l) => l.id === id);
            if (!src) return d;
            const copy = cloneLayer(src);
            copyId = copy.id;
            return { ...d, layers: [...d.layers, copy] };
          });
          if (copyId) set({ selection: { kind: "layer", id: copyId }, selectedIds: [copyId] });
        },

        duplicateSelected: () => {
          const ids = get().selectedIds;
          if (!ids.length) return;
          snapNow();
          const copies: Layer[] = [];
          mutate((d) => {
            for (const id of ids) {
              const src = d.layers.find((l) => l.id === id);
              if (src) copies.push(cloneLayer(src));
            }
            return { ...d, layers: [...d.layers, ...copies] };
          });
          if (copies.length) {
            set({
              selectedIds: copies.map((c) => c.id),
              selection: { kind: "layer", id: copies[0].id },
            });
          }
        },

        nudgeSelected: (dx, dy, snapGrid = 0) => {
          const s = get();
          const d = activeDoc();
          if (!d || !s.selectedIds.length) return;
          mutate((doc) => ({
            ...doc,
            layers: doc.layers.map((l) => {
              if (l.locked) return l;
              const inSel =
                s.selectedIds.includes(l.id) ||
                Boolean(
                  l.groupId &&
                    doc.layers.some((o) => s.selectedIds.includes(o.id) && o.groupId === l.groupId),
                );
              if (!inSel) return l;
              const curX = l.x * doc.width;
              const curY = l.y * doc.height;
              const nx =
                dx === 0 ? curX : snapGrid > 0 ? snapToward(curX, snapGrid, dx) : roundPx(curX + dx);
              const ny =
                dy === 0 ? curY : snapGrid > 0 ? snapToward(curY, snapGrid, dy) : roundPx(curY + dy);
              return {
                ...l,
                x: Math.max(0, Math.min(1, nx / doc.width)),
                y: Math.max(0, Math.min(1, ny / doc.height)),
              };
            }),
          }));
        },

        rotateSelected: (deg) => {
          const ids = get().selectedIds;
          if (!ids.length) return;
          mutate((d) => ({
            ...d,
            layers: d.layers.map((l) =>
              ids.includes(l.id) && !l.locked ? { ...l, rotation: l.rotation + deg } : l,
            ),
          }));
        },

        bring: (id, dir) => {
          snapNow();
          mutate((d) => {
            const i = d.layers.findIndex((l) => l.id === id);
            if (i < 0) return d;
            const layers = [...d.layers];
            const [row] = layers.splice(i, 1);
            if (dir === "top") layers.push(row);
            else if (dir === "bottom") layers.unshift(row);
            else if (dir === "up") layers.splice(Math.min(i + 1, layers.length), 0, row);
            else layers.splice(Math.max(i - 1, 0), 0, row);
            return { ...d, layers };
          });
        },

        align: (how) => {
          snapNow();
          const ids = get().selectedIds;
          mutate((d) => {
            const targets = d.layers.filter((l) => ids.includes(l.id));
            if (!targets.length) return d;
            const box = (l: Layer) => ({
              l: l.x - l.w / 2,
              r: l.x + l.w / 2,
              t: l.y - l.h / 2,
              b: l.y + l.h / 2,
            });
            return {
              ...d,
              layers: d.layers.map((l) => {
                if (!ids.includes(l.id)) return l;
                if (how === "bar-center") return { ...l, x: 0.5, y: 0.5 };
                if (how === "left") {
                  const min = Math.min(...targets.map((t) => box(t).l));
                  return { ...l, x: min + l.w / 2 };
                }
                if (how === "right") {
                  const max = Math.max(...targets.map((t) => box(t).r));
                  return { ...l, x: max - l.w / 2 };
                }
                if (how === "center") {
                  const mid =
                    (Math.min(...targets.map((t) => box(t).l)) +
                      Math.max(...targets.map((t) => box(t).r))) /
                    2;
                  return { ...l, x: mid };
                }
                if (how === "top") {
                  const min = Math.min(...targets.map((t) => box(t).t));
                  return { ...l, y: min + l.h / 2 };
                }
                if (how === "bottom") {
                  const max = Math.max(...targets.map((t) => box(t).b));
                  return { ...l, y: max - l.h / 2 };
                }
                const mid =
                  (Math.min(...targets.map((t) => box(t).t)) +
                    Math.max(...targets.map((t) => box(t).b))) /
                  2;
                return { ...l, y: mid };
              }),
            };
          });
        },

        distribute: (axis) => {
          snapNow();
          const ids = get().selectedIds;
          mutate((d) => {
            const targets = d.layers
              .filter((l) => ids.includes(l.id))
              .sort((a, b) => (axis === "x" ? a.x - b.x : a.y - b.y));
            if (targets.length < 3) return d;
            const first = targets[0];
            const last = targets[targets.length - 1];
            const span = axis === "x" ? last.x - first.x : last.y - first.y;
            const step = span / (targets.length - 1);
            const pos = new Map<string, number>();
            targets.forEach((t, i) => pos.set(t.id, (axis === "x" ? first.x : first.y) + step * i));
            return {
              ...d,
              layers: d.layers.map((l) => {
                const p = pos.get(l.id);
                if (p == null) return l;
                return axis === "x" ? { ...l, x: p } : { ...l, y: p };
              }),
            };
          });
        },

        flipSelected: (axis) => {
          snapNow();
          const ids = get().selectedIds;
          mutate((d) => ({
            ...d,
            layers: d.layers.map((l) =>
              ids.includes(l.id)
                ? axis === "x"
                  ? { ...l, flipX: !l.flipX }
                  : { ...l, flipY: !l.flipY }
                : l,
            ),
          }));
        },

        groupSelected: () => {
          const ids = get().selectedIds;
          if (ids.length < 2) return;
          snapNow();
          const gid = uid("gp");
          mutate((d) => ({
            ...d,
            layers: d.layers.map((l) => (ids.includes(l.id) ? { ...l, groupId: gid } : l)),
          }));
        },

        ungroupSelected: () => {
          snapNow();
          const ids = get().selectedIds;
          const d = activeDoc();
          const gids = new Set(
            d?.layers.filter((l) => ids.includes(l.id) && l.groupId).map((l) => l.groupId as string),
          );
          mutate((doc) => ({
            ...doc,
            layers: doc.layers.map((l) =>
              l.groupId && gids.has(l.groupId) ? { ...l, groupId: null } : l,
            ),
          }));
        },

        copySelected: () => {
          const s = get();
          const d = activeDoc();
          if (!d) return;
          set({
            clipboard: d.layers
              .filter((l) => s.selectedIds.includes(l.id))
              .map((l) => structuredClone(l)),
          });
        },

        paste: () => {
          const clip = get().clipboard;
          if (!clip.length) return;
          snapNow();
          const copies = clip.map((l) => cloneLayer(l, 0.05));
          mutate((d) => ({ ...d, layers: [...d.layers, ...copies] }), {
            selectedIds: copies.map((c) => c.id),
            selection: { kind: "layer", id: copies[0].id },
          });
        },

        applySample: (hex) => {
          const s = get();
          set({ currentColor: hex, recentColors: rememberColor(s.recentColors, hex) });
          if (s.selection.kind === "stripe") get().updateStripe(s.selection.id, { color: hex });
          else if (s.selectedIds.length) get().updateLayers(s.selectedIds, { fill: hex });
        },

        fillAt: (kind, id) => {
          const hex = get().currentColor;
          const d = activeDoc();
          if (!d) return;
          if (kind === "stripe") {
            const st = d.stripes.find((s) => s.id === id);
            if (!st || st.locked || st.visible === false) return;
            get().updateStripe(id, { color: hex });
            return;
          }
          const layer = d.layers.find((l) => l.id === id);
          if (!layer || layer.locked || !layer.visible) return;
          get().updateLayer(id, { fill: hex });
        },

        smartSnap: () => {
          snapNow();
          const step = get().snap || 1;
          mutate((d) => ({
            ...d,
            stripes: d.stripes.map((st) => ({
              ...st,
              weight: Math.max(0.25, Math.round(st.weight * 2) / 2),
            })),
            layers: d.layers.map((l) => {
              const px = (n: number, dim: number) => {
                const v = n * dim;
                const q = step > 0 ? Math.round(v / step) * step : v;
                return q / dim;
              };
              return {
                ...l,
                x: px(l.x, d.width),
                y: px(l.y, d.height),
                w: px(l.w, d.width),
                h: px(l.h, d.height),
                rotation: Math.round(l.rotation / 15) * 15,
              };
            }),
          }));
        },

        saveNamed: (name) => {
          const d = activeDoc();
          if (!d) return;
          const project: SavedProject = {
            id: uid("sv"),
            name: name || d.name,
            savedAt: Date.now(),
            doc: structuredClone(d),
          };
          set((s) => ({ saves: [project, ...s.saves].slice(0, 40) }));
        },

        loadSave: (id) => {
          const save = get().saves.find((x) => x.id === id);
          if (!save) return;
          get().importDoc(save.doc);
        },

        removeSave: (id) => set((s) => ({ saves: s.saves.filter((x) => x.id !== id) })),

        keepTemplate: (name) => {
          const d = activeDoc();
          if (!d) return;
          const label = name || d.name;
          const project: SavedProject = {
            id: uid("tp"),
            name: label,
            savedAt: Date.now(),
            doc: structuredClone(d),
          };
          set((s) => ({
            userTemplates: [project, ...s.userTemplates.filter((t) => t.name !== label)].slice(0, 40),
          }));
        },

        loadUserTemplate: (id) => {
          const row = get().userTemplates.find((t) => t.id === id);
          if (!row) return;
          get().importDoc(row.doc);
        },

        removeUserTemplate: (id) =>
          set((s) => ({ userTemplates: s.userTemplates.filter((t) => t.id !== id) })),

        addPalette: (name, colors) =>
          set((s) => ({
            palettes: [{ id: uid("pl"), name, colors }, ...s.palettes].slice(0, 24),
          })),

        updatePalette: (id, patch) =>
          set((s) => ({
            palettes: s.palettes.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          })),

        removePalette: (id) => set((s) => ({ palettes: s.palettes.filter((p) => p.id !== id) })),
      };
    },
    {
      name: "merit-press-v3",
      partialize: (s) => ({
        docs: s.docs.slice(0, 16),
        activeId: s.activeId,
        zoom: s.zoom,
        snap: s.snap,
        showGrid: s.showGrid,
        showGuides: s.showGuides,
        currentColor: s.currentColor,
        recentColors: s.recentColors,
        saves: s.saves.slice(0, 40),
        userTemplates: (s.userTemplates ?? []).slice(0, 40),
        palettes: s.palettes,
      }),
      skipHydration: true,
    },
  ),
);

export function templatesForPicker() {
  return builtInTemplates();
}
