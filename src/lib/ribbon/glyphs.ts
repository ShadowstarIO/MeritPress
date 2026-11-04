export type GlyphGroup = {
  id: string;
  label: string;
  items: { id: string; label: string; text: string }[];
};

const chars = (s: string, prefix: string) =>
  s.split("").map((c) => ({ id: `${prefix}-${c}`, label: c, text: c }));

export const GLYPH_GROUPS: GlyphGroup[] = [
  { id: "letters", label: "Letters", items: chars("ABCDEFGHIJKLMNOPQRSTUVWXYZ", "L") },
  { id: "numbers", label: "Numbers", items: chars("0123456789", "N") },
  {
    id: "roman",
    label: "Roman",
    items: ["I", "II", "III", "IV", "V", "VI", "X"].map((t) => ({
      id: `R-${t}`,
      label: t,
      text: t,
    })),
  },
  {
    id: "stars",
    label: "Stars",
    items: ["★", "☆", "✦", "✧", "✪", "✯", "✡", "✶", "✴"].map((t, i) => ({
      id: `S-${i}`,
      label: t,
      text: t,
    })),
  },
  {
    id: "marks",
    label: "Marks",
    items: ["✚", "✝", "✛", "❖", "◆", "●", "▲", "■", "♦", "♠", "♣", "♥", "⚙", "⚖", "⚔", "⚑", "☀", "❄", "⚡", "✦"].map(
      (t, i) => ({ id: `M-${i}`, label: t, text: t }),
    ),
  },
  {
    id: "arrows",
    label: "Arrows",
    items: ["←", "→", "↑", "↓", "↔", "↕", "⇐", "⇒", "⇧", "⇩", "↩", "↪"].map((t, i) => ({
      id: `A-${i}`,
      label: t,
      text: t,
    })),
  },
  {
    id: "ornament",
    label: "Ornament",
    items: ["❦", "❧", "❋", "✿", "❀", "❖", "✦", "✧", "✶", "✹", "✺", "✻"].map((t, i) => ({
      id: `O-${i}`,
      label: t,
      text: t,
    })),
  },
];
