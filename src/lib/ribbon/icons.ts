export type IconDef = {
  id: string;
  label: string;
  draw: (ctx: CanvasRenderingContext2D) => void;
};

function stroke(ctx: CanvasRenderingContext2D, width = 0.08) {
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

const ICONS: IconDef[] = [
  {
    id: "star",
    label: "Star",
    draw(ctx) {
      star(ctx, 0, 0, 0.46, 5);
      ctx.fill();
    },
  },
  {
    id: "laurel",
    label: "Laurel",
    draw(ctx) {
      ctx.beginPath();
      for (const side of [-1, 1]) {
        ctx.moveTo(0, 0.42);
        ctx.bezierCurveTo(side * 0.55, 0.3, side * 0.58, -0.25, 0, -0.46);
        for (let i = 0; i < 6; i++) {
          const t = i / 5;
          const y = 0.38 - t * 0.78;
          const x = side * (0.16 + Math.sin(t * Math.PI) * 0.28);
          leaf(ctx, x, y, side * 0.14, 0.08, side);
        }
      }
      ctx.fill();
    },
  },
  {
    id: "trophy",
    label: "Trophy",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(-0.22, -0.28);
      ctx.lineTo(0.22, -0.28);
      ctx.quadraticCurveTo(0.3, 0.05, 0.08, 0.16);
      ctx.lineTo(-0.08, 0.16);
      ctx.quadraticCurveTo(-0.3, 0.05, -0.22, -0.28);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.rect(-0.12, 0.16, 0.24, 0.08);
      ctx.rect(-0.2, 0.28, 0.4, 0.08);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-0.22, -0.1, 0.14, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(0.22, -0.1, 0.14, -Math.PI * 0.5, Math.PI * 0.5);
      stroke(ctx, 0.06);
    },
  },
  {
    id: "scales",
    label: "Scales",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(0, -0.42);
      ctx.lineTo(0, 0.32);
      ctx.moveTo(-0.08, 0.32);
      ctx.lineTo(0.08, 0.32);
      ctx.moveTo(-0.2, 0.4);
      ctx.lineTo(0.2, 0.4);
      ctx.moveTo(-0.38, -0.18);
      ctx.lineTo(0.38, -0.18);
      stroke(ctx, 0.07);
      pan(ctx, -0.28, -0.18);
      pan(ctx, 0.28, -0.18);
      ctx.beginPath();
      ctx.arc(0, -0.42, 0.06, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    id: "book",
    label: "Manual",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(-0.08, -0.38);
      ctx.lineTo(-0.4, -0.28);
      ctx.lineTo(-0.4, 0.38);
      ctx.lineTo(-0.04, 0.28);
      ctx.closePath();
      ctx.moveTo(0.08, -0.38);
      ctx.lineTo(0.4, -0.28);
      ctx.lineTo(0.4, 0.38);
      ctx.lineTo(0.04, 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -0.4);
      ctx.lineTo(0, 0.3);
      stroke(ctx, 0.07);
    },
  },
  {
    id: "bolt",
    label: "Lightning",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(0.08, -0.46);
      ctx.lineTo(-0.22, 0.02);
      ctx.lineTo(0.04, 0.02);
      ctx.lineTo(-0.1, 0.46);
      ctx.lineTo(0.28, -0.04);
      ctx.lineTo(0.02, -0.04);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: "pistol",
    label: "Sidearm",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(-0.44, -0.08);
      ctx.lineTo(0.38, -0.08);
      ctx.lineTo(0.42, 0.02);
      ctx.lineTo(0.1, 0.04);
      ctx.lineTo(0.04, 0.34);
      ctx.lineTo(-0.16, 0.38);
      ctx.lineTo(-0.12, 0.06);
      ctx.lineTo(-0.44, 0.04);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: "shield",
    label: "Shield",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(0, -0.46);
      ctx.lineTo(0.38, -0.28);
      ctx.lineTo(0.34, 0.1);
      ctx.quadraticCurveTo(0.28, 0.4, 0, 0.48);
      ctx.quadraticCurveTo(-0.28, 0.4, -0.34, 0.1);
      ctx.lineTo(-0.38, -0.28);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: "wings",
    label: "Wings",
    draw(ctx) {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0.08);
        ctx.bezierCurveTo(side * 0.2, -0.05, side * 0.48, -0.08, side * 0.46, -0.28);
        ctx.bezierCurveTo(side * 0.3, -0.12, side * 0.12, -0.02, 0, 0.08);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 0.16);
        ctx.bezierCurveTo(side * 0.28, 0.08, side * 0.5, 0.18, side * 0.46, 0.34);
        ctx.bezierCurveTo(side * 0.22, 0.16, side * 0.08, 0.14, 0, 0.16);
        ctx.fill();
      }
    },
  },
  {
    id: "roman-i",
    label: "Roman I",
    draw(ctx) {
      ctx.beginPath();
      ctx.rect(-0.1, -0.28, 0.2, 0.56);
      ctx.rect(-0.22, -0.36, 0.44, 0.1);
      ctx.rect(-0.22, 0.26, 0.44, 0.1);
      ctx.fill();
    },
  },
  {
    id: "winged-i",
    label: "Winged I",
    draw(ctx) {
      ctx.save();
      ctx.translate(0, 0.06);
      ctx.scale(0.92, 0.92);
      ICONS.find((i) => i.id === "wings")?.draw(ctx);
      ctx.fillStyle = ctx.strokeStyle;
      ICONS.find((i) => i.id === "roman-i")?.draw(ctx);
      ctx.restore();
      ctx.beginPath();
      star(ctx, 0, -0.4, 0.12, 5);
      ctx.fill();
    },
  },
  {
    id: "car",
    label: "Cruiser",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(-0.4, 0.08);
      ctx.lineTo(-0.28, -0.18);
      ctx.lineTo(0.12, -0.18);
      ctx.lineTo(0.32, 0.0);
      ctx.lineTo(0.42, 0.08);
      ctx.lineTo(0.42, 0.22);
      ctx.lineTo(-0.4, 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-0.22, 0.26, 0.1, 0, Math.PI * 2);
      ctx.arc(0.22, 0.26, 0.1, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    id: "feather",
    label: "Quill",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(0.28, -0.4);
      ctx.quadraticCurveTo(-0.05, -0.2, -0.32, 0.38);
      ctx.quadraticCurveTo(0.1, 0.05, 0.32, -0.28);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0.2, -0.32);
      ctx.lineTo(-0.18, 0.22);
      stroke(ctx, 0.04);
    },
  },
  {
    id: "check",
    label: "Check",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(-0.32, 0.04);
      ctx.lineTo(-0.08, 0.3);
      ctx.lineTo(0.38, -0.28);
      stroke(ctx, 0.12);
    },
  },
  {
    id: "diamond",
    label: "Diamond",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(0, -0.46);
      ctx.lineTo(0.38, 0);
      ctx.lineTo(0, 0.46);
      ctx.lineTo(-0.38, 0);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: "heart",
    label: "Heart",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(0, 0.38);
      ctx.bezierCurveTo(-0.5, 0.05, -0.42, -0.38, 0, -0.12);
      ctx.bezierCurveTo(0.42, -0.38, 0.5, 0.05, 0, 0.38);
      ctx.fill();
    },
  },
  {
    id: "leaf",
    label: "Oak leaf",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(0.02, 0.42);
      ctx.bezierCurveTo(-0.4, 0.2, -0.3, -0.3, 0.08, -0.44);
      ctx.bezierCurveTo(0.42, -0.2, 0.28, 0.22, 0.02, 0.42);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0.02, 0.38);
      ctx.quadraticCurveTo(0.04, 0, 0.08, -0.36);
      stroke(ctx, 0.05);
    },
  },
  {
    id: "eagle",
    label: "Eagle",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(0, -0.1);
      ctx.bezierCurveTo(-0.5, -0.05, -0.42, 0.28, -0.1, 0.16);
      ctx.lineTo(0, 0.22);
      ctx.lineTo(0.1, 0.16);
      ctx.bezierCurveTo(0.42, 0.28, 0.5, -0.05, 0, -0.1);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -0.1);
      ctx.lineTo(0, -0.36);
      ctx.lineTo(0.12, -0.22);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: "chevron",
    label: "Chevron",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(-0.36, 0.18);
      ctx.lineTo(0, -0.28);
      ctx.lineTo(0.36, 0.18);
      ctx.lineTo(0.2, 0.28);
      ctx.lineTo(0, -0.04);
      ctx.lineTo(-0.2, 0.28);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: "hash",
    label: "Hash",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(-0.18, -0.4);
      ctx.lineTo(-0.32, 0.4);
      ctx.moveTo(0.28, -0.4);
      ctx.lineTo(0.14, 0.4);
      ctx.moveTo(-0.42, -0.12);
      ctx.lineTo(0.42, -0.2);
      ctx.moveTo(-0.42, 0.18);
      ctx.lineTo(0.42, 0.1);
      stroke(ctx, 0.08);
    },
  },
  {
    id: "roman-ii",
    label: "Roman II",
    draw(ctx) {
      ctx.save();
      ctx.translate(-0.16, 0);
      ctx.scale(0.72, 0.9);
      ICONS.find((i) => i.id === "roman-i")?.draw(ctx);
      ctx.restore();
      ctx.save();
      ctx.translate(0.16, 0);
      ctx.scale(0.72, 0.9);
      ICONS.find((i) => i.id === "roman-i")?.draw(ctx);
      ctx.restore();
    },
  },
  {
    id: "roman-iii",
    label: "Roman III",
    draw(ctx) {
      for (const x of [-0.24, 0, 0.24]) {
        ctx.save();
        ctx.translate(x, 0);
        ctx.scale(0.55, 0.9);
        ICONS.find((i) => i.id === "roman-i")?.draw(ctx);
        ctx.restore();
      }
    },
  },
  {
    id: "cuffs",
    label: "Cuffs",
    draw(ctx) {
      ctx.beginPath();
      ctx.arc(-0.2, 0, 0.22, 0, Math.PI * 2);
      ctx.arc(0.2, 0, 0.22, 0, Math.PI * 2);
      stroke(ctx, 0.08);
      ctx.beginPath();
      ctx.moveTo(-0.02, 0);
      ctx.lineTo(0.02, 0);
      stroke(ctx, 0.1);
    },
  },
  {
    id: "target",
    label: "Target",
    draw(ctx) {
      ctx.beginPath();
      ctx.arc(0, 0, 0.42, 0, Math.PI * 2);
      ctx.arc(0, 0, 0.26, 0, Math.PI * 2);
      ctx.arc(0, 0, 0.1, 0, Math.PI * 2);
      stroke(ctx, 0.07);
      ctx.beginPath();
      ctx.moveTo(0, -0.48);
      ctx.lineTo(0, 0.48);
      ctx.moveTo(-0.48, 0);
      ctx.lineTo(0.48, 0);
      stroke(ctx, 0.05);
    },
  },
  {
    id: "torch",
    label: "Torch",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(-0.08, 0.08);
      ctx.lineTo(0.08, 0.08);
      ctx.lineTo(0.05, 0.46);
      ctx.lineTo(-0.05, 0.46);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -0.44);
      ctx.quadraticCurveTo(-0.22, -0.1, 0, 0.1);
      ctx.quadraticCurveTo(0.22, -0.1, 0, -0.44);
      ctx.fill();
    },
  },
  {
    id: "sunburst",
    label: "Sunburst",
    draw(ctx) {
      ctx.beginPath();
      ctx.arc(0, 0, 0.16, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 0.22, Math.sin(a) * 0.22);
        ctx.lineTo(Math.cos(a) * 0.46, Math.sin(a) * 0.46);
        stroke(ctx, 0.06);
      }
    },
  },
  {
    id: "key",
    label: "Key",
    draw(ctx) {
      ctx.beginPath();
      ctx.arc(-0.18, -0.18, 0.2, 0, Math.PI * 2);
      stroke(ctx, 0.08);
      ctx.beginPath();
      ctx.moveTo(-0.04, -0.04);
      ctx.lineTo(0.38, 0.38);
      ctx.moveTo(0.18, 0.18);
      ctx.lineTo(0.32, 0.08);
      ctx.moveTo(0.28, 0.28);
      ctx.lineTo(0.4, 0.16);
      stroke(ctx, 0.08);
    },
  },
  {
    id: "cluster",
    label: "Oak cluster",
    draw(ctx) {
      ctx.save();
      ctx.translate(-0.12, 0.04);
      ctx.rotate(-0.4);
      ctx.scale(0.7, 0.7);
      ICONS.find((i) => i.id === "leaf")?.draw(ctx);
      ctx.restore();
      ctx.save();
      ctx.translate(0.14, -0.02);
      ctx.rotate(0.5);
      ctx.scale(0.7, 0.7);
      ICONS.find((i) => i.id === "leaf")?.draw(ctx);
      ctx.restore();
    },
  },
  {
    id: "cross",
    label: "Cross",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(0, -0.44);
      ctx.lineTo(0, 0.44);
      ctx.moveTo(-0.3, -0.12);
      ctx.lineTo(0.3, -0.12);
      stroke(ctx, 0.12);
    },
  },
  {
    id: "badge",
    label: "Badge",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(0, -0.46);
      ctx.lineTo(0.28, -0.28);
      ctx.lineTo(0.34, 0.06);
      ctx.lineTo(0, 0.46);
      ctx.lineTo(-0.34, 0.06);
      ctx.lineTo(-0.28, -0.28);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -0.04, 0.12, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fill();
    },
  },
  {
    id: "radio",
    label: "Radio",
    draw(ctx) {
      ctx.beginPath();
      ctx.roundRect(-0.22, -0.12, 0.44, 0.4, 0.06);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-0.08, -0.12);
      ctx.lineTo(-0.02, -0.4);
      ctx.lineTo(0.16, -0.34);
      stroke(ctx, 0.06);
    },
  },
  {
    id: "flag",
    label: "Flag",
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(-0.28, -0.42);
      ctx.lineTo(-0.28, 0.42);
      stroke(ctx, 0.08);
      ctx.beginPath();
      ctx.moveTo(-0.24, -0.4);
      ctx.lineTo(0.38, -0.22);
      ctx.lineTo(-0.24, -0.02);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: "compass",
    label: "Compass",
    draw(ctx) {
      ctx.beginPath();
      ctx.arc(0, 0, 0.4, 0, Math.PI * 2);
      stroke(ctx, 0.07);
      ctx.beginPath();
      ctx.moveTo(0, -0.32);
      ctx.lineTo(0.1, 0);
      ctx.lineTo(0, 0.32);
      ctx.lineTo(-0.1, 0);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: "whistle",
    label: "Whistle",
    draw(ctx) {
      ctx.beginPath();
      ctx.ellipse(-0.08, 0.04, 0.26, 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0.12, -0.04);
      ctx.lineTo(0.42, -0.12);
      ctx.lineTo(0.42, 0.12);
      ctx.lineTo(0.12, 0.1);
      ctx.closePath();
      ctx.fill();
    },
  },
];

function star(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  n: number,
) {
  ctx.moveTo(x, y - r);
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n - Math.PI / 2;
    const b = a + Math.PI / n;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(b) * r * 0.4, y + Math.sin(b) * r * 0.4);
  }
  ctx.closePath();
}

function leaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  side: number,
) {
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + dx, y - dy * side, x + dx * 1.4, y);
  ctx.quadraticCurveTo(x + dx, y + dy * side, x, y);
}

function pan(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 0.12, y + 0.22);
  ctx.lineTo(x + 0.12, y + 0.22);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y + 0.26, 0.14, 0.08, 0, 0, Math.PI * 2);
  ctx.stroke();
}

export function getIcon(id: string): IconDef | undefined {
  return ICONS.find((i) => i.id === id);
}

export function listIcons(): IconDef[] {
  return ICONS;
}

export function drawIcon(
  ctx: CanvasRenderingContext2D,
  id: string,
  fill: string,
  strokeColor: string,
) {
  const icon = getIcon(id);
  if (!icon) return;
  ctx.fillStyle = fill;
  ctx.strokeStyle = strokeColor || fill;
  icon.draw(ctx);
}
