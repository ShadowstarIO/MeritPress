import { useRef, useState, type ReactNode } from "react";
import { Field, Input, Range, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { listIcons } from "@/lib/ribbon/icons";
import { GLYPH_GROUPS } from "@/lib/ribbon/glyphs";
import { collectPalette, preloadImage } from "@/lib/ribbon/render";
import { columnsOf, defaultLayerName, defaultStripeName, fmtPx, layerKindLabel, roundPx } from "@/lib/ribbon/columns";
import { useRibbonStore } from "@/lib/ribbon/store";
import {
  BLEND_MODES,
  DIVISION_PALETTES,
  FINISHES,
  OVERLAYS,
  SHAPES,
  type Finish,
  type Layer,
  type OverlayKind,
} from "@/lib/ribbon/types";
import { IconSwatch } from "./IconSwatch";
import {
  AlignCenter,
  AlignHorizontalDistributeCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalDistributeCenter,
  ChevronDown,
  ChevronUp,
  Columns2,
  Copy,
  Equal,
  Eye,
  EyeOff,
  FlipHorizontal2,
  FlipVertical2,
  FolderPlus,
  GripVertical,
  Lock,
  Plus,
  SplitSquareHorizontal,
  Trash2,
  Unlock,
  Upload,
} from "lucide-react";

export function LeftPanel() {
  const docs = useRibbonStore((s) => s.docs);
  const activeId = useRibbonStore((s) => s.activeId);
  const selection = useRibbonStore((s) => s.selection);
  const doc = docs.find((d) => d.id === activeId) ?? docs[0];
  if (!doc) return null;
  const stripe =
    selection.kind === "stripe" ? doc.stripes.find((s) => s.id === selection.id) : undefined;

  return (
    <aside className="order-2 flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-border bg-panel p-3 max-h-[40vh] md:order-1 md:h-full md:max-h-none md:w-72 md:border-r">
      <Block title="Ribbon">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width">
            <Input
              type="number"
              step={1}
              min={1}
              value={doc.width}
              onChange={(e) =>
                useRibbonStore.getState().setSize(Number(e.target.value) || 1, doc.height)
              }
            />
          </Field>
          <Field label="Height">
            <Input
              type="number"
              step={1}
              min={1}
              value={doc.height}
              onChange={(e) =>
                useRibbonStore.getState().setSize(doc.width, Number(e.target.value) || 1)
              }
            />
          </Field>
        </div>
        <Slider
          label="Satin"
          value={doc.texture.satin}
          onChange={(satin) =>
            useRibbonStore.getState().updateDoc({ texture: { ...doc.texture, satin } })
          }
        />
        <Slider
          label="Sheen"
          value={doc.texture.sheen}
          onChange={(sheen) =>
            useRibbonStore.getState().updateDoc({ texture: { ...doc.texture, sheen } })
          }
        />
        <Slider
          label="Bevel"
          value={doc.texture.bevel}
          onChange={(bevel) =>
            useRibbonStore.getState().updateDoc({ texture: { ...doc.texture, bevel } })
          }
        />
        <Slider
          label="Grain"
          value={doc.texture.grain}
          onChange={(grain) =>
            useRibbonStore.getState().updateDoc({ texture: { ...doc.texture, grain } })
          }
        />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Border">
            <Input
              type="number"
              step={0.01}
              value={doc.texture.border}
              onChange={(e) =>
                useRibbonStore.getState().updateDoc({
                  texture: { ...doc.texture, border: Number(e.target.value) },
                })
              }
            />
          </Field>
          <Field label="Border color">
            <Input
              type="color"
              className="w-full p-1"
              value={toColor(doc.texture.borderColor)}
              onChange={(e) =>
                useRibbonStore.getState().updateDoc({
                  texture: { ...doc.texture, borderColor: e.target.value },
                })
              }
            />
          </Field>
        </div>
        <Field label="Whole ribbon">
          <Select
            value={doc.wear?.kind ?? "none"}
            onChange={(e) =>
              useRibbonStore.getState().updateDoc({
                wear: { kind: e.target.value as OverlayKind, amount: doc.wear?.amount ?? 0.35 },
              })
            }
          >
            {OVERLAYS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        {(doc.wear?.kind ?? "none") !== "none" && (
          <Slider
            label="Amount"
            value={doc.wear?.amount ?? 0.35}
            onChange={(amount) =>
              useRibbonStore.getState().updateDoc({
                wear: { kind: doc.wear?.kind ?? "dirt", amount },
              })
            }
          />
        )}
        <p className="text-[11px] leading-relaxed text-subtle">
          Dirt, dust, mud, and the rest cover the cloth and every device. Open a layer if only that device should be worn.
        </p>
      </Block>

      <Block title="Columns">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={doc.mirrorColumns}
              onChange={(e) =>
                useRibbonStore.getState().updateDoc({ mirrorColumns: e.target.checked })
              }
            />
            Mirror opposite columns
          </label>
          <ul className="grid gap-1">
            {columnsOf(doc).map((col, i, all) => {
              const s = col.stripe;
              const selected = selection.kind === "stripe" && selection.id === s.id;
              const title = s.name.trim() || defaultStripeName(s);
              const custom = title.toLowerCase() !== "stripe" && title.toLowerCase() !== s.finish;
              const last = i === all.length - 1;
              return (
                <li
                  key={s.id}
                  draggable
                  onDragStart={(e) => {
                    if ((e.target as HTMLElement).closest("input,button")) {
                      e.preventDefault();
                      return;
                    }
                    e.dataTransfer.setData("text/stripe", s.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/stripe");
                    if (id) useRibbonStore.getState().reorderStripe(id, i);
                  }}
                  className={`rounded-[10px] px-1.5 py-1 ${selected ? "bg-elevated" : "hover:bg-elevated/60"} ${
                    !s.visible ? "opacity-45" : ""
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <GripVertical className="size-3.5 shrink-0 text-subtle" />
                    <button
                      type="button"
                      title="Column color"
                      className="size-4 shrink-0 rounded-[3px] border border-border"
                      style={{ background: s.color }}
                      onClick={() => clickStripe(s.id)}
                    />
                    <button
                      type="button"
                      onClick={() => clickStripe(s.id)}
                      className="min-w-0 flex-1 truncate text-left text-sm"
                    >
                      {title}
                      {custom && <span className="ml-1 text-[10px] uppercase tracking-wide text-subtle">stripe</span>}
                    </button>
                    <RowActions
                      hidden={!s.visible}
                      locked={s.locked}
                      onHide={() => {
                        useRibbonStore.getState().capture();
                        useRibbonStore.getState().updateStripe(s.id, { visible: !s.visible });
                      }}
                      onLock={() => {
                        useRibbonStore.getState().capture();
                        useRibbonStore.getState().updateStripe(s.id, { locked: !s.locked });
                      }}
                      onClone={() => useRibbonStore.getState().duplicateStripe(s.id)}
                      onDelete={() => useRibbonStore.getState().removeStripe(s.id)}
                      deleteDisabled={doc.stripes.length <= 1}
                    />
                  </div>
                  <div
                    className="mt-0.5 flex items-center gap-1 pl-8 font-mono text-[10px] text-subtle"
                    onClick={() => clickStripe(s.id)}
                  >
                    <span className="tabular-nums">{fmtPx(col.left)}</span>
                    <span>↘</span>
                    {last ? (
                      <span className="tabular-nums">| {fmtPx(col.right)}</span>
                    ) : (
                      <input
                        type="number"
                        step={0.01}
                        draggable={false}
                        disabled={s.locked || all[i + 1]?.stripe.locked}
                        className="h-6 w-[4.2rem] rounded-[6px] border border-border bg-bg px-1 tabular-nums text-fg disabled:opacity-40"
                        value={fmtPx(col.right)}
                        title="Right edge (px)"
                        onClick={(e) => e.stopPropagation()}
                        onFocus={() => useRibbonStore.getState().setSelection({ kind: "stripe", id: s.id })}
                        onChange={(e) =>
                          useRibbonStore.getState().setColumnEdge(i, Number(e.target.value) || 0)
                        }
                      />
                    )}
                    <span className="ml-auto tabular-nums">{fmtPx(col.w)}w</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-1">
            <IconBtn title="Add column" onClick={() => useRibbonStore.getState().addStripe()}>
              <Plus className="size-3.5" />
            </IconBtn>
            <IconBtn title="Equalize" onClick={() => useRibbonStore.getState().equalizeStripes()}>
              <Equal className="size-3.5" />
            </IconBtn>
            <IconBtn title="Reverse" onClick={() => useRibbonStore.getState().mirrorStripes()}>
              <Columns2 className="size-3.5" />
            </IconBtn>
            <IconBtn
              title="Split"
              disabled={selection.kind !== "stripe"}
              onClick={() =>
                selection.kind === "stripe" && useRibbonStore.getState().splitStripe(selection.id)
              }
            >
              <SplitSquareHorizontal className="size-3.5" />
            </IconBtn>
          </div>
          {stripe && <StripeEditor stripeId={stripe.id} />}
      </Block>
    </aside>
  );
}

function StripeEditor({ stripeId }: { stripeId: string }) {
  const docs = useRibbonStore((s) => s.docs);
  const activeId = useRibbonStore((s) => s.activeId);
  const snap = useRibbonStore((s) => s.snap);
  const doc = docs.find((d) => d.id === activeId);
  const stripe = doc?.stripes.find((s) => s.id === stripeId);
  if (!stripe || !doc) return null;
  const col = columnsOf(doc).find((c) => c.stripe.id === stripe.id);
  const locked = stripe.locked;
  return (
    <div className="mt-3 grid gap-2">
      <Field label="Name">
        <Input
          value={stripe.name}
          placeholder="Stripe"
          onChange={(e) => useRibbonStore.getState().updateStripe(stripe.id, { name: e.target.value })}
          onBlur={(e) => {
            if (!e.target.value.trim()) {
              useRibbonStore.getState().updateStripe(stripe.id, { name: defaultStripeName(stripe) });
            }
          }}
        />
      </Field>
      <fieldset disabled={locked} className="grid gap-2 disabled:opacity-50">
      <Field label="Color">
        <div className="flex gap-2">
          <Input
            type="color"
            className="w-12 p-1"
            value={toColor(stripe.color)}
            onChange={(e) => useRibbonStore.getState().updateStripe(stripe.id, { color: e.target.value })}
          />
          <Input
            value={stripe.color}
            onChange={(e) => useRibbonStore.getState().updateStripe(stripe.id, { color: e.target.value })}
          />
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Width px">
          <Input
            type="number"
            step={0.01}
            value={col ? fmtPx(col.w) : "0"}
            onChange={(e) =>
              useRibbonStore.getState().setColumnWidth(stripe.id, Number(e.target.value) || 0.25, 0)
            }
          />
        </Field>
        <Field label="Repeat">
          <Input
            type="number"
            step={1}
            min={1}
            value={stripe.repeat}
            onChange={(e) =>
              useRibbonStore.getState().updateStripe(stripe.id, {
                repeat: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </Field>
      </div>
      <Field label="Finish">
        <Select
          value={stripe.finish}
          onChange={(e) =>
            useRibbonStore.getState().updateStripe(stripe.id, { finish: e.target.value as Finish })
          }
        >
          {FINISHES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Pattern scale">
          <Input
            type="number"
            step={0.01}
            min={0.25}
            value={stripe.scale}
            onChange={(e) =>
              useRibbonStore.getState().updateStripe(stripe.id, { scale: Number(e.target.value) || 1 })
            }
          />
        </Field>
        <Field label="Pattern rotate">
          <Input
            type="number"
            step={0.1}
            value={stripe.rotation}
            onChange={(e) =>
              useRibbonStore.getState().updateStripe(stripe.id, { rotation: Number(e.target.value) || 0 })
            }
          />
        </Field>
      </div>
      {(stripe.finish === "hash" || stripe.repeat > 1) && (
        <Field label="Alt color">
          <Input
            type="color"
            className="p-1"
            value={toColor(stripe.hashColor)}
            onChange={(e) =>
              useRibbonStore.getState().updateStripe(stripe.id, { hashColor: e.target.value })
            }
          />
        </Field>
      )}
      {stripe.finish === "piping" && (
        <Field label="Piping">
          <Input
            type="color"
            className="p-1"
            value={toColor(stripe.pipingColor)}
            onChange={(e) =>
              useRibbonStore.getState().updateStripe(stripe.id, { pipingColor: e.target.value })
            }
          />
        </Field>
      )}
      </fieldset>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => useRibbonStore.getState().moveStripe(stripe.id, -1)}
        >
          <ChevronUp className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => useRibbonStore.getState().moveStripe(stripe.id, 1)}
        >
          <ChevronDown className="size-3.5" />
        </Button>
      </div>
      {snap > 0 && (
        <p className="text-[10px] text-subtle">Hold Shift while dragging an edge to snap to {snap}px.</p>
      )}
    </div>
  );
}

export function RightPanel() {
  const docs = useRibbonStore((s) => s.docs);
  const activeId = useRibbonStore((s) => s.activeId);
  const selection = useRibbonStore((s) => s.selection);
  const selectedIds = useRibbonStore((s) => s.selectedIds);
  const palettes = useRibbonStore((s) => s.palettes);
  const currentColor = useRibbonStore((s) => s.currentColor);
  const recentColors = useRibbonStore((s) => s.recentColors);
  const [library, setLibrary] = useState<"devices" | "glyphs" | "shapes">("devices");
  const [query, setQuery] = useState("");
  const [glyphGroup, setGlyphGroup] = useState(GLYPH_GROUPS[0].id);
  const fileRef = useRef<HTMLInputElement>(null);
  const doc = docs.find((d) => d.id === activeId) ?? docs[0];
  if (!doc) return null;
  const icons = listIcons().filter(
    (i) =>
      !query ||
      i.label.toLowerCase().includes(query.toLowerCase()) ||
      i.id.includes(query.toLowerCase()),
  );
  const glyphs = GLYPH_GROUPS.find((g) => g.id === glyphGroup) ?? GLYPH_GROUPS[0];
  const recent = recentColors ?? [];
  const inUse = collectPalette(doc);

  return (
    <aside className="order-3 flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-border bg-panel p-3 max-h-[40vh] md:order-3 md:h-full md:max-h-none md:w-72 md:border-l">
      <Block title="Color">
        <div className="flex gap-2">
          <Input
            type="color"
            className="h-10 w-14 p-1"
            value={toColor(currentColor)}
            onChange={(e) => useRibbonStore.getState().setCurrentColor(e.target.value)}
          />
          <Input
            value={currentColor}
            onChange={(e) => useRibbonStore.getState().setCurrentColor(e.target.value)}
          />
        </div>
        {recent.length > 0 && (
          <>
            <p className="text-[10px] uppercase tracking-[0.14em] text-subtle">Last used</p>
            <Swatches colors={recent} onPick={(c) => useRibbonStore.getState().applySample(c)} />
          </>
        )}
        <p className="text-[10px] uppercase tracking-[0.14em] text-subtle">
          {recent.length ? "On this ribbon" : "In use"}
        </p>
        {inUse.length === 0 ? (
          <p className="text-xs text-subtle">Colors you pick stay in Last used.</p>
        ) : (
          <Swatches colors={inUse} onPick={(c) => useRibbonStore.getState().applySample(c)} />
        )}
        <details className="group/pal">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-subtle [&::-webkit-details-marker]:hidden [&::marker]:content-none">
            <ChevronDown
              aria-hidden
              className="size-3.5 shrink-0 -rotate-90 text-subtle transition-transform duration-150 ease-out group-open/pal:rotate-0 motion-reduce:transition-none"
            />
            Palettes
          </summary>
          <div className="mt-2 grid gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                useRibbonStore.getState().addPalette("Custom", collectPalette(doc).slice(0, 8))
              }
            >
              <FolderPlus className="size-3.5" />
              Save palette
            </Button>
            <Field label="Palette templates">
              <Select
                onChange={(e) => {
                  const name = e.target.value;
                  if (!name) return;
                  const colors = DIVISION_PALETTES[name];
                  if (colors) useRibbonStore.getState().addPalette(name, colors);
                  e.target.value = "";
                }}
              >
                <option value="">Add a guide palette…</option>
                {Object.keys(DIVISION_PALETTES).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
            {palettes.length === 0 && (
              <p className="text-xs text-subtle">Saved palettes show up here.</p>
            )}
            {palettes.map((palette) => (
              <div key={palette.id}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-subtle">{palette.name}</p>
                  <button
                    type="button"
                    className="text-subtle hover:text-fg"
                    onClick={() => useRibbonStore.getState().removePalette(palette.id)}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
                <Swatches colors={palette.colors} onPick={(c) => useRibbonStore.getState().applySample(c)} />
              </div>
            ))}
          </div>
        </details>
      </Block>

      <Block title="Add">
        <Select value={library} onChange={(e) => setLibrary(e.target.value as typeof library)}>
          <option value="devices">Devices</option>
          <option value="glyphs">Glyphs</option>
          <option value="shapes">Shapes</option>
        </Select>
        {library === "devices" && (
          <>
            <Input placeholder="Search devices" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="grid max-h-52 grid-cols-5 gap-1 overflow-y-auto">
              {icons.map((icon) => (
                <button
                  key={icon.id}
                  title={icon.label}
                  onClick={() => useRibbonStore.getState().addIcon(icon.id)}
                  className="flex h-10 items-center justify-center rounded-[10px] border border-border hover:bg-elevated"
                >
                  <IconSwatch id={icon.id} fill={currentColor} className="size-7" />
                </button>
              ))}
            </div>
          </>
        )}
        {library === "glyphs" && (
          <>
            <Select value={glyphGroup} onChange={(e) => setGlyphGroup(e.target.value)}>
              {GLYPH_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </Select>
            <div className="grid max-h-52 grid-cols-6 gap-1 overflow-y-auto">
              {glyphs.items.map((g) => (
                <button
                  key={g.id}
                  title={g.label}
                  onClick={() => useRibbonStore.getState().addText(g.text)}
                  className="h-9 rounded-[10px] border border-border text-sm hover:bg-elevated"
                >
                  {g.text}
                </button>
              ))}
            </div>
          </>
        )}
        {library === "shapes" && (
          <>
            <div className="grid max-h-52 grid-cols-4 gap-1 overflow-y-auto">
              {SHAPES.map((kind) => (
                <button
                  key={kind}
                  onClick={() => useRibbonStore.getState().addShape(kind)}
                  className="h-9 rounded-[10px] border border-border text-[10px] uppercase tracking-wide text-muted hover:bg-elevated hover:text-fg"
                >
                  {kind}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => useRibbonStore.getState().addText()}>
                Text
              </Button>
              <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
                <Upload className="size-3.5" />
                Image / SVG
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg,image/webp,.svg"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const src = await readFile(file);
                  await preloadImage(src).catch(() => undefined);
                  useRibbonStore.getState().addImage(src);
                  e.target.value = "";
                }}
              />
            </div>
          </>
        )}
      </Block>

      <Block title="Layers">
        <ul className="grid gap-1">
          {doc.layers.length === 0 && <li className="text-xs text-subtle">No layers yet.</li>}
          {[...doc.layers].reverse().map((l, visualIndex) => {
            const kind = layerKindLabel(l);
            const title = l.name.trim() || defaultLayerName(l);
            const custom = title.toLowerCase() !== defaultLayerName(l).toLowerCase();
            const zIndex = doc.layers.length - 1 - visualIndex;
            const open = selection.kind === "layer" && selection.id === l.id;
            return (
              <li
                key={l.id}
                draggable
                onDragStart={(e) => {
                  if ((e.target as HTMLElement).closest("input,button,select,[data-layer-edit]")) {
                    e.preventDefault();
                    return;
                  }
                  e.dataTransfer.setData("text/layer", l.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/layer");
                  if (id) useRibbonStore.getState().reorderLayer(id, zIndex);
                }}
                className={`rounded-[10px] ${open ? "bg-elevated" : ""}`}
              >
                <div
                  onClick={(e) => clickLayer(l.id, e.shiftKey)}
                  className={`flex w-full cursor-pointer items-center gap-1 rounded-[10px] px-1.5 py-1.5 text-sm ${
                    selectedIds.includes(l.id) && !open ? "bg-elevated" : ""
                  } ${!open ? "hover:bg-elevated/60" : ""} ${!l.visible ? "opacity-45" : ""}`}
                >
                  <GripVertical className="size-3.5 shrink-0 text-subtle" />
                  <ChevronDown
                    aria-hidden
                    className={`size-3.5 shrink-0 text-subtle transition-transform duration-150 ${open ? "rotate-0" : "-rotate-90"}`}
                  />
                  <span className="min-w-0 flex-1 truncate text-left">
                    {title}
                    {custom && (
                      <span className="ml-1 text-[10px] uppercase tracking-wide text-subtle">{kind}</span>
                    )}
                  </span>
                  {l.groupId && <span className="text-[10px] text-subtle">g</span>}
                  <RowActions
                    hidden={!l.visible}
                    locked={l.locked}
                    onHide={() => {
                      useRibbonStore.getState().capture();
                      useRibbonStore.getState().updateLayer(l.id, { visible: !l.visible });
                    }}
                    onLock={() => {
                      useRibbonStore.getState().capture();
                      useRibbonStore.getState().updateLayer(l.id, { locked: !l.locked });
                    }}
                    onClone={() => useRibbonStore.getState().duplicateLayer(l.id)}
                    onDelete={() => useRibbonStore.getState().removeLayer(l.id)}
                  />
                </div>
                {open && <LayerInspector layer={l} width={doc.width} height={doc.height} />}
              </li>
            );
          })}
        </ul>
      </Block>
    </aside>
  );
}

function LayerInspector({
  layer,
  width,
  height,
}: {
  layer: Layer;
  width: number;
  height: number;
}) {
  const set = (patch: Partial<Layer>) => {
    const ids = useRibbonStore.getState().selectedIds;
    if (ids.length > 1) useRibbonStore.getState().updateLayers(ids, patch);
    else useRibbonStore.getState().updateLayer(layer.id, patch);
  };
  const px = (n: number, dim: number) => roundPx(n * dim);
  const locked = layer.locked;
  const xform = useRibbonStore((s) => s.xform);
  const selectedIds = useRibbonStore((s) => s.selectedIds);
  return (
    <div data-layer-edit className="grid gap-2 border-t border-line px-1.5 py-2">
      <Field label="Name">
        <Input
          value={layer.name}
          onChange={(e) => set({ name: e.target.value })}
          onBlur={(e) => {
            if (!e.target.value.trim()) set({ name: defaultLayerName(layer) });
          }}
        />
      </Field>
      <div className="flex flex-wrap gap-1">
        {(["move", "rotate", "stretch", "skew"] as const).map((m) => (
          <Button
            key={m}
            size="sm"
            variant={xform === m ? "secondary" : "ghost"}
            onClick={() => useRibbonStore.getState().setXform(m)}
          >
            {m}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        <IconBtn title="Left" onClick={() => useRibbonStore.getState().align("left")}>
          <AlignLeft className="size-3.5" />
        </IconBtn>
        <IconBtn title="Center" onClick={() => useRibbonStore.getState().align("center")}>
          <AlignCenter className="size-3.5" />
        </IconBtn>
        <IconBtn title="Right" onClick={() => useRibbonStore.getState().align("right")}>
          <AlignRight className="size-3.5" />
        </IconBtn>
        <IconBtn title="Distribute X" onClick={() => useRibbonStore.getState().distribute("x")}>
          <AlignHorizontalDistributeCenter className="size-3.5" />
        </IconBtn>
        <IconBtn title="Distribute Y" onClick={() => useRibbonStore.getState().distribute("y")}>
          <AlignVerticalDistributeCenter className="size-3.5" />
        </IconBtn>
        <IconBtn title="Bar center" onClick={() => useRibbonStore.getState().align("bar-center")}>
          ·
        </IconBtn>
        <IconBtn title="Flip X" onClick={() => useRibbonStore.getState().flipSelected("x")}>
          <FlipHorizontal2 className="size-3.5" />
        </IconBtn>
        <IconBtn title="Flip Y" onClick={() => useRibbonStore.getState().flipSelected("y")}>
          <FlipVertical2 className="size-3.5" />
        </IconBtn>
        <Button
          size="sm"
          variant="secondary"
          disabled={selectedIds.length < 2}
          onClick={() => useRibbonStore.getState().groupSelected()}
        >
          Group
        </Button>
        <Button size="sm" variant="ghost" onClick={() => useRibbonStore.getState().ungroupSelected()}>
          Ungroup
        </Button>
      </div>
      <fieldset disabled={locked} className="grid gap-2 disabled:opacity-50">
      <div className="grid grid-cols-2 gap-2">
        <Field label="X px">
          <Input
            type="number"
            step={0.01}
            value={px(layer.x, width)}
            onChange={(e) => set({ x: Number(e.target.value) / width })}
          />
        </Field>
        <Field label="Y px">
          <Input
            type="number"
            step={0.01}
            value={px(layer.y, height)}
            onChange={(e) => set({ y: Number(e.target.value) / height })}
          />
        </Field>
        <Field label="W px">
          <Input
            type="number"
            step={0.01}
            value={px(layer.w, width)}
            onChange={(e) => set({ w: Number(e.target.value) / width })}
          />
        </Field>
        <Field label="H px">
          <Input
            type="number"
            step={0.01}
            value={px(layer.h, height)}
            onChange={(e) => set({ h: Number(e.target.value) / height })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Rotate">
          <Input
            type="number"
            step={0.1}
            value={layer.rotation}
            onChange={(e) => set({ rotation: Number(e.target.value) })}
          />
        </Field>
        <Field label="Skew">
          <Input
            type="number"
            step={0.1}
            value={layer.skewX}
            onChange={(e) => set({ skewX: Number(e.target.value) })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Repeat X">
          <Input
            type="number"
            min={1}
            step={1}
            value={layer.repeatX}
            onChange={(e) => set({ repeatX: Math.max(1, Number(e.target.value) || 1) })}
          />
        </Field>
        <Field label="Repeat Y">
          <Input
            type="number"
            min={1}
            step={1}
            value={layer.repeatY}
            onChange={(e) => set({ repeatY: Math.max(1, Number(e.target.value) || 1) })}
          />
        </Field>
        <Field label="Gap">
          <Input
            type="number"
            step={0.01}
            value={layer.repeatGap}
            onChange={(e) => set({ repeatGap: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>
      <Slider label="Opacity" value={layer.opacity} onChange={(opacity) => set({ opacity })} />
      <Field label="Blend">
        <Select value={layer.blend} onChange={(e) => set({ blend: e.target.value as Layer["blend"] })}>
          {BLEND_MODES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Finish">
        <Select value={layer.finish} onChange={(e) => set({ finish: e.target.value as Finish })}>
          {FINISHES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Overlay">
        <Select
          value={layer.overlay}
          onChange={(e) => set({ overlay: e.target.value as OverlayKind })}
        >
          {OVERLAYS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      {layer.overlay !== "none" && (
        <Slider
          label="Overlay amount"
          value={layer.overlayAmount}
          onChange={(overlayAmount) => set({ overlayAmount })}
        />
      )}
      <Field label="Fill">
        <div className="flex gap-2">
          <Input
            type="color"
            className="w-12 p-1"
            value={toColor(layer.fill)}
            onChange={(e) => set({ fill: e.target.value })}
          />
          <Input value={layer.fill} onChange={(e) => set({ fill: e.target.value })} />
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Stroke">
          <Input
            type="color"
            className="p-1"
            value={toColor(layer.stroke)}
            onChange={(e) => set({ stroke: e.target.value })}
          />
        </Field>
        <Field label="Stroke px">
          <Input
            type="number"
            step={0.01}
            value={layer.strokeWidth}
            onChange={(e) => set({ strokeWidth: Number(e.target.value) })}
          />
        </Field>
      </div>
      {layer.type === "text" && (
        <Field label="Text">
          <Input value={layer.text} onChange={(e) => set({ text: e.target.value } as Partial<Layer>)} />
        </Field>
      )}
      {layer.type === "icon" && (
        <Field label="Device">
          <Select
            value={layer.iconId}
            onChange={(e) => set({ iconId: e.target.value } as Partial<Layer>)}
          >
            {listIcons().map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {layer.type === "shape" && layer.kind === "ring" && (
        <Slider
          label="Inner"
          value={layer.innerRatio}
          onChange={(innerRatio) => set({ innerRatio } as Partial<Layer>)}
        />
      )}
      </fieldset>
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="secondary" onClick={() => useRibbonStore.getState().bring(layer.id, "up")}>
          Up
        </Button>
        <Button size="sm" variant="secondary" onClick={() => useRibbonStore.getState().bring(layer.id, "down")}>
          Down
        </Button>
        <Button size="sm" variant="secondary" onClick={() => useRibbonStore.getState().duplicateSelected()}>
          <Copy className="size-3.5" />
        </Button>
        <Button size="sm" variant="secondary" onClick={() => useRibbonStore.getState().removeSelected()}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group rounded-[10px] border border-line bg-inset">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-[10px] px-2 py-1.5 text-[11px] uppercase tracking-[0.18em] text-subtle hover:bg-raised hover:text-muted group-open:rounded-b-none group-open:border-b group-open:border-line [&::-webkit-details-marker]:hidden [&::marker]:content-none">
        <ChevronDown
          aria-hidden
          className="size-3.5 shrink-0 -rotate-90 text-subtle transition-transform duration-150 ease-out group-open:rotate-0 motion-reduce:transition-none"
        />
        <span className="min-w-0 flex-1 truncate">{title}</span>
      </summary>
      <div className="grid gap-2 px-2 py-2">{children}</div>
    </details>
  );
}

function clickStripe(id: string) {
  const s = useRibbonStore.getState();
  if (s.selection.kind === "stripe" && s.selection.id === id) s.setSelection({ kind: "none" });
  else s.setSelection({ kind: "stripe", id });
}

function clickLayer(id: string, additive: boolean) {
  const s = useRibbonStore.getState();
  if (!additive && s.selectedIds.length === 1 && s.selectedIds[0] === id) {
    s.setSelection({ kind: "none" });
  } else {
    s.setSelection({ kind: "layer", id }, additive);
  }
}

function RowActions({
  hidden,
  locked,
  onHide,
  onLock,
  onClone,
  onDelete,
  deleteDisabled,
}: {
  hidden: boolean;
  locked: boolean;
  onHide: () => void;
  onLock: () => void;
  onClone: () => void;
  onDelete: () => void;
  deleteDisabled?: boolean;
}) {
  return (
    <span
      className="flex shrink-0 items-center"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        title={hidden ? "Show" : "Hide"}
        onClick={onHide}
        className="inline-flex size-6 items-center justify-center rounded-[6px] text-subtle hover:bg-raised hover:text-fg"
      >
        {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
      <button
        type="button"
        title={locked ? "Unlock" : "Lock"}
        onClick={onLock}
        className="inline-flex size-6 items-center justify-center rounded-[6px] text-subtle hover:bg-raised hover:text-fg"
      >
        {locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
      </button>
      <button
        type="button"
        title="Clone"
        onClick={onClone}
        className="inline-flex size-6 items-center justify-center rounded-[6px] text-subtle hover:bg-raised hover:text-fg"
      >
        <Copy className="size-3.5" />
      </button>
      <button
        type="button"
        title="Delete"
        disabled={deleteDisabled}
        onClick={onDelete}
        className="inline-flex size-6 items-center justify-center rounded-[6px] text-subtle hover:bg-raised hover:text-fg disabled:opacity-40"
      >
        <Trash2 className="size-3.5" />
      </button>
    </span>
  );
}

function IconBtn({
  title,
  onClick,
  children,
  disabled,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-[8px] border border-border text-muted hover:bg-elevated hover:text-fg disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Swatches({ colors, onPick }: { colors: string[]; onPick: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {colors.map((c) => (
        <button
          key={c}
          title={c}
          onClick={() => onPick(c)}
          className="size-6 rounded-[5px] border border-border"
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={`${label} ${Math.round(value * 100)}`}>
      <Range min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  );
}

function toColor(v: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : "#000000";
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
