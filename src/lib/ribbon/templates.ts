import { uid } from "./ids";
import {
  DEFAULT_GRID,
  DEFAULT_RACK,
  DEFAULT_TEXTURE,
  DEFAULT_WEAR,
  type Finish,
  type IconLayer,
  type RibbonDoc,
  type Stripe,
} from "./types";

function stripe(
  color: string,
  weight: number,
  finish: Finish = "flat",
  hashColor = "#C8A84B",
): Stripe {
  return {
    id: uid("st"),
    weight,
    color,
    finish,
    hashColor,
    pipingColor: "#F4F1EA",
    repeat: 1,
    scale: 1,
    rotation: 0,
    name: "Stripe",
    visible: true,
    locked: false,
  };
}

function device(iconId: string, fill: string, extra?: Partial<IconLayer>): IconLayer {
  return {
    id: uid("ly"),
    type: "icon",
    name: iconId,
    iconId,
    x: 0.5,
    y: 0.5,
    w: 0.22,
    h: 0.72,
    rotation: 0,
    skewX: 0,
    skewY: 0,
    opacity: 1,
    blend: "source-over",
    visible: true,
    locked: false,
    fill,
    stroke: fill,
    strokeWidth: 0,
    flipX: false,
    flipY: false,
    groupId: null,
    finish: "flat",
    overlay: "none",
    overlayAmount: 0.4,
    repeatX: 1,
    repeatY: 1,
    repeatGap: 0.08,
    ...extra,
  };
}

function doc(
  slug: string,
  name: string,
  width: number,
  height: number,
  stripes: Stripe[],
  layers: RibbonDoc["layers"] = [],
): RibbonDoc {
  return {
    id: `tpl-${slug}`,
    name,
    width,
    height,
    stripes: stripes.map((s, i) => ({ ...s, id: `st-${slug}-${i}` })),
    layers: layers.map((l, i) => ({ ...l, id: `ly-${slug}-${i}` })),
    texture: { ...DEFAULT_TEXTURE },
    wear: { ...DEFAULT_WEAR },
    flatten: { enabled: false, levels: 12, snapPalette: true },
    rack: { ...DEFAULT_RACK },
    grid: { ...DEFAULT_GRID },
    mirrorColumns: false,
  };
}

const BLUE = "#2F4FA8";
const WHITE = "#EDECEA";
const RED = "#B33B3F";
const BLACK = "#12141A";
const GOLD = "#D4B45A";
const NAVY = "#14213D";

export function inspectorRibbon(): RibbonDoc {
  return doc(
    "detective-i",
    "Detective I",
    236,
    66,
    [
      stripe(BLUE, 14),
      stripe(WHITE, 22),
      stripe(BLACK, 6, "hash", GOLD),
      stripe(BLACK, 16),
      stripe(BLACK, 6, "hash", GOLD),
      stripe(WHITE, 22),
      stripe(RED, 14),
    ],
    [
      device("winged-i", GOLD, {
        name: "Winged I",
        w: 0.2,
        h: 0.78,
        fill: "#E8D48A",
        stroke: "#8A6A22",
        strokeWidth: 0.4,
      }),
    ],
  );
}

export function builtInTemplates(): RibbonDoc[] {
  return [
    inspectorRibbon(),
    doc(
      "training",
      "Training Distinction",
      236,
      66,
      [
        stripe("#1F7A3A", 18),
        stripe(WHITE, 16),
        stripe("#2B5AA8", 32),
        stripe(WHITE, 16),
        stripe("#1F7A3A", 18),
      ],
      [device("book", WHITE, { w: 0.16, h: 0.62 })],
    ),
    doc(
      "metro",
      "Metro",
      236,
      66,
      [
        stripe(NAVY, 22),
        stripe("#C9A227", 10, "metal"),
        stripe(NAVY, 36),
        stripe("#C9A227", 10, "metal"),
        stripe(NAVY, 22),
      ],
      [device("car", "#C9A227", { w: 0.2, h: 0.58 })],
    ),
    doc(
      "admin",
      "Administrative",
      236,
      66,
      [
        stripe("#8E1D1D", 20),
        stripe(WHITE, 16),
        stripe("#D7B12A", 28, "metal"),
        stripe(WHITE, 16),
        stripe("#161616", 20),
      ],
      [device("feather", "#161616", { fill: "#161616", w: 0.16, h: 0.6 })],
    ),
    doc(
      "db",
      "Detective Bureau",
      236,
      66,
      [
        stripe(BLACK, 18),
        stripe(WHITE, 14),
        stripe("#5C3D8F", 36),
        stripe(WHITE, 14),
        stripe(BLACK, 18),
      ],
      [device("scales", WHITE, { w: 0.18, h: 0.7 })],
    ),
    doc(
      "parking",
      "Colorful Parking",
      236,
      66,
      [
        stripe("#6B3FA0", 16),
        stripe("#E4C441", 16),
        stripe("#2B5AA8", 16),
        stripe("#D45A1C", 16),
        stripe("#2F8A4A", 16),
        stripe("#1A1A1C", 20),
      ],
      [device("shield", "#EDECEA", { w: 0.14, h: 0.62 })],
    ),
    doc(
      "yearly",
      "Yearly Commendation",
      236,
      66,
      [
        stripe(NAVY, 12),
        stripe(GOLD, 8, "piping"),
        stripe(WHITE, 60),
        stripe(GOLD, 8, "piping"),
        stripe(NAVY, 12),
      ],
      [
        device("trophy", GOLD, {
          y: 0.48,
          w: 0.16,
          h: 0.62,
          fill: "#C9A227",
        }),
        device("laurel", "#2F6A38", {
          name: "Laurel",
          w: 0.3,
          h: 0.9,
          opacity: 0.95,
        }),
      ],
    ),
    doc(
      "integrity",
      "Integrity",
      236,
      66,
      [stripe(BLUE, 8, "piping"), stripe(WHITE, 84), stripe(RED, 8, "piping")],
      [device("eagle", NAVY, { w: 0.22, h: 0.7, fill: NAVY })],
    ),
    doc(
      "lifesaving",
      "Life Saving",
      236,
      66,
      [
        stripe(RED, 12),
        stripe(WHITE, 18),
        stripe(GOLD, 40, "metal"),
        stripe(WHITE, 18),
        stripe(RED, 12),
      ],
      [device("cross", WHITE, { w: 0.16, h: 0.62, fill: "#8E1D1D" })],
    ),
    doc(
      "marksman",
      "Marksman",
      236,
      66,
      [
        stripe(NAVY, 28),
        stripe(GOLD, 8, "piping"),
        stripe(BLACK, 28),
        stripe(GOLD, 8, "piping"),
        stripe(NAVY, 28),
      ],
      [device("target", GOLD, { w: 0.2, h: 0.7 })],
    ),
  ];
}

export function blankRibbon(width = 236, height = 66): RibbonDoc {
  return doc("blank", "Untitled bar", width, height, [
    stripe(BLUE, 20),
    stripe(WHITE, 60),
    stripe(RED, 20),
  ]);
}

export function cloneDoc(source: RibbonDoc, name?: string): RibbonDoc {
  const copy = structuredClone(source) as RibbonDoc;
  copy.id = uid("rb");
  copy.name = name ?? `${source.name} copy`;
  copy.stripes = copy.stripes.map((s) => ({ ...s, id: uid("st") }));
  const gmap = new Map<string, string>();
  copy.layers = copy.layers.map((l) => {
    let groupId = l.groupId;
    if (groupId) {
      if (!gmap.has(groupId)) gmap.set(groupId, uid("gp"));
      groupId = gmap.get(groupId) ?? null;
    }
    return { ...l, id: uid("ly"), groupId };
  });
  copy.rack = { ...(copy.rack ?? { ...DEFAULT_RACK }) };
  copy.grid = { ...(copy.grid ?? { ...DEFAULT_GRID }) };
  return copy;
}

export function normalizeStripe(s: Partial<Stripe> & Pick<Stripe, "color" | "weight">): Stripe {
  return {
    id: s.id ?? uid("st"),
    weight: s.weight,
    color: s.color,
    finish: s.finish ?? "flat",
    hashColor: s.hashColor ?? "#C8A84B",
    pipingColor: s.pipingColor ?? "#F4F1EA",
    repeat: s.repeat ?? 1,
    scale: s.scale ?? 1,
    rotation: s.rotation ?? 0,
    name: s.name ?? "Stripe",
    visible: s.visible !== false,
    locked: Boolean(s.locked),
  };
}

export function normalizeLayer<T extends RibbonDoc["layers"][number]>(l: T): T {
  return {
    ...l,
    skewX: l.skewX ?? 0,
    skewY: l.skewY ?? 0,
    finish: l.finish ?? "flat",
    overlay: l.overlay ?? "none",
    overlayAmount: l.overlayAmount ?? 0.4,
    repeatX: l.repeatX ?? 1,
    repeatY: l.repeatY ?? 1,
    repeatGap: l.repeatGap ?? 0.08,
    flipX: l.flipX ?? false,
    flipY: l.flipY ?? false,
    groupId: l.groupId ?? null,
  };
}
