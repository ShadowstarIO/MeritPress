export type BlendMode =
  | "source-over"
  | "multiply"
  | "screen"
  | "overlay"
  | "soft-light"
  | "hard-light"
  | "color-dodge"
  | "lighten"
  | "darken";

export type Finish =
  | "flat"
  | "satin"
  | "hash"
  | "piping"
  | "metal"
  | "chrome"
  | "brass"
  | "enamel"
  | "matte"
  | "gloss"
  | "velvet"
  | "felt"
  | "leather"
  | "foil"
  | "embroidered"
  | "carbon"
  | "glow"
  | "worn";

export type OverlayKind =
  | "none"
  | "scratches"
  | "dirt"
  | "mud"
  | "damage"
  | "torn"
  | "sparkle"
  | "wet"
  | "dust"
  | "rust";

export type Tool =
  | "select"
  | "move"
  | "eyedrop"
  | "fill"
  | "erase"
  | "brush"
  | "marquee"
  | "stamp";

export type XformMode = "move" | "rotate" | "stretch" | "skew";

export type Stripe = {
  id: string;
  name: string;
  weight: number;
  color: string;
  finish: Finish;
  hashColor: string;
  pipingColor: string;
  repeat: number;
  scale: number;
  rotation: number;
  visible: boolean;
  locked: boolean;
};

export type ShapeKind =
  | "rect"
  | "circle"
  | "triangle"
  | "ring"
  | "tube"
  | "diamond"
  | "hexagon"
  | "star";

export type LayerBase = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  skewX: number;
  skewY: number;
  opacity: number;
  blend: BlendMode;
  visible: boolean;
  locked: boolean;
  fill: string;
  stroke: string;
  strokeWidth: number;
  flipX: boolean;
  flipY: boolean;
  groupId: string | null;
  finish: Finish;
  overlay: OverlayKind;
  overlayAmount: number;
  repeatX: number;
  repeatY: number;
  repeatGap: number;
};

export type ShapeLayer = LayerBase & {
  type: "shape";
  kind: ShapeKind;
  corner: number;
  innerRatio: number;
};

export type IconLayer = LayerBase & {
  type: "icon";
  iconId: string;
};

export type TextLayer = LayerBase & {
  type: "text";
  text: string;
  font: string;
  weight: number;
};

export type ImageLayer = LayerBase & {
  type: "image";
  src: string;
};

export type Layer = ShapeLayer | IconLayer | TextLayer | ImageLayer;

export type Texture = {
  satin: number;
  sheen: number;
  bevel: number;
  grain: number;
  border: number;
  borderColor: string;
};

export type GridSpec = {
  color: string;
  opacity: number;
  adaptive: boolean;
  size: number;
};

export type SizePreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  note: string;
};

export type RackSpec = {
  cols: number;
  rows: number;
  gap: number;
};

export type UserPalette = {
  id: string;
  name: string;
  colors: string[];
};

export type SavedProject = {
  id: string;
  name: string;
  savedAt: number;
  doc: RibbonDoc;
};

export type Wear = {
  kind: OverlayKind;
  amount: number;
};

export type RibbonDoc = {
  id: string;
  name: string;
  width: number;
  height: number;
  stripes: Stripe[];
  layers: Layer[];
  texture: Texture;
  wear: Wear;
  flatten: {
    enabled: boolean;
    levels: number;
    snapPalette: boolean;
  };
  rack: RackSpec;
  grid: GridSpec;
  mirrorColumns: boolean;
};

export type Selection =
  | { kind: "none" }
  | { kind: "stripe"; id: string }
  | { kind: "layer"; id: string };

export const SIZE_PRESETS: SizePreset[] = [
  {
    id: "forum",
    label: "Forum flair",
    width: 236,
    height: 66,
    note: "phpBB profile flair · primary",
  },
  {
    id: "retina",
    label: "Retina 2×",
    width: 472,
    height: 132,
    note: "Same bar, doubled for sharp posting",
  },
  {
    id: "square",
    label: "Profile square",
    width: 66,
    height: 66,
    note: "Compact post icon",
  },
  {
    id: "rack3",
    label: "Three-across rack",
    width: 720,
    height: 66,
    note: "Array · three 236 bars, 6px gutters",
  },
  {
    id: "rack5",
    label: "Five-across rack",
    width: 1204,
    height: 66,
    note: "Dress rack row",
  },
  {
    id: "device",
    label: "Center device",
    width: 132,
    height: 132,
    note: "Emblem plate before placing on a bar",
  },
];

export const DIVISION_PALETTES: Record<string, string[]> = {
  Administrative: ["#8E1D1D", "#F4F1EA", "#D7B12A", "#161616"],
  Media: ["#8A8A8A", "#C9C9C9", "#4A4A4A", "#1F1F1F"],
  Training: ["#1F7A3A", "#F4F1EA", "#2B5AA8", "#163018"],
  "General Ops": ["#14213D", "#6B1D2A", "#F4F1EA", "#111318"],
  Metro: ["#C9A227", "#14213D", "#F4F1EA", "#0E1524"],
  Detective: ["#111111", "#F4F1EA", "#5C3D8F", "#2A1A44"],
};

export const DEFAULT_TEXTURE: Texture = {
  satin: 0.85,
  sheen: 0.7,
  bevel: 0.55,
  grain: 0.12,
  border: 1,
  borderColor: "#1a1a1c",
};

export const DEFAULT_WEAR: Wear = { kind: "none", amount: 0.35 };

export const DEFAULT_RACK: RackSpec = { cols: 1, rows: 1, gap: 6 };

export const DEFAULT_GRID: GridSpec = {
  color: "#d8d3c6",
  opacity: 0.45,
  adaptive: true,
  size: 1,
};

export const BLEND_MODES: BlendMode[] = [
  "source-over",
  "multiply",
  "screen",
  "overlay",
  "soft-light",
  "hard-light",
  "color-dodge",
  "lighten",
  "darken",
];

export const FINISHES: { id: Finish; label: string }[] = [
  { id: "flat", label: "Flat" },
  { id: "satin", label: "Satin" },
  { id: "matte", label: "Matte" },
  { id: "gloss", label: "Gloss" },
  { id: "hash", label: "Hash" },
  { id: "piping", label: "Piping" },
  { id: "metal", label: "Metal" },
  { id: "chrome", label: "Chrome" },
  { id: "brass", label: "Brass" },
  { id: "enamel", label: "Enamel" },
  { id: "foil", label: "Foil" },
  { id: "velvet", label: "Velvet" },
  { id: "felt", label: "Felt" },
  { id: "leather", label: "Leather" },
  { id: "embroidered", label: "Stitched" },
  { id: "carbon", label: "Carbon" },
  { id: "glow", label: "Glow" },
  { id: "worn", label: "Worn" },
];

export const OVERLAYS: { id: OverlayKind; label: string }[] = [
  { id: "none", label: "None" },
  { id: "scratches", label: "Scratches" },
  { id: "dirt", label: "Dirt" },
  { id: "mud", label: "Mud" },
  { id: "damage", label: "Damage" },
  { id: "torn", label: "Torn" },
  { id: "sparkle", label: "Sparkle" },
  { id: "wet", label: "Wet" },
  { id: "dust", label: "Dust" },
  { id: "rust", label: "Rust" },
];

export const SHAPES: ShapeKind[] = [
  "rect",
  "circle",
  "triangle",
  "ring",
  "tube",
  "diamond",
  "hexagon",
  "star",
];
