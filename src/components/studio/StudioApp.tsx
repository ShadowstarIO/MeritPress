import { useEffect, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Field, Input, Range } from "@/components/ui/field";
import { RibbonCanvas } from "./RibbonCanvas";
import { LeftPanel, RightPanel } from "./SidePanels";
import { Stacker } from "./Stacker";
import {
  download,
  downloadText,
  exportPng,
  exportSvg,
  packMerit,
  parseMeritFile,
  slug,
} from "@/lib/ribbon/export";
import { templatesForPicker, useRibbonStore } from "@/lib/ribbon/store";
import type { Tool } from "@/lib/ribbon/types";
import { cn } from "@/lib/cn";
import {
  Copy,
  Eraser,
  Keyboard,
  Lasso,
  Minus,
  MousePointer2,
  Move,
  PaintBucket,
  Paintbrush,
  Pipette,
  Plus,
  Redo2,
  Scan,
  Stamp,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";

type MenuId = "templates" | "saves" | "export" | "view" | "grid" | "stack" | null;

const TOOLS: { id: Tool; label: string; hint: string; Icon: typeof MousePointer2 }[] = [
  { id: "select", label: "Select", hint: "V", Icon: MousePointer2 },
  { id: "move", label: "Move", hint: "M", Icon: Move },
  { id: "marquee", label: "Marquee", hint: "L", Icon: Lasso },
  { id: "brush", label: "Brush", hint: "B", Icon: Paintbrush },
  { id: "fill", label: "Fill", hint: "G", Icon: PaintBucket },
  { id: "erase", label: "Erase", hint: "E", Icon: Eraser },
  { id: "eyedrop", label: "Eyedrop", hint: "I", Icon: Pipette },
  { id: "stamp", label: "Stamp", hint: "T", Icon: Stamp },
];

export function StudioApp({ template }: { template?: string }) {
  const [booted, setBooted] = useState(true);
  const [help, setHelp] = useState(false);
  const [menu, setMenu] = useState<MenuId>(null);
  const [fileNote, setFileNote] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const zoom = useRibbonStore((s) => s.zoom);
  const tool = useRibbonStore((s) => s.tool);
  const past = useRibbonStore((s) => s.past);
  const future = useRibbonStore((s) => s.future);
  const docs = useRibbonStore((s) => s.docs);
  const activeId = useRibbonStore((s) => s.activeId);
  const saves = useRibbonStore((s) => s.saves);
  const userTemplates = useRibbonStore((s) => s.userTemplates);
  const snap = useRibbonStore((s) => s.snap);
  const showGrid = useRibbonStore((s) => s.showGrid);
  const showGuides = useRibbonStore((s) => s.showGuides);
  const doc = docs.find((d) => d.id === activeId) ?? docs[0];

  useEffect(() => {
    let alive = true;
    useRibbonStore.getState().hydrate();
    setBooted(true);
    void Promise.resolve(useRibbonStore.persist.rehydrate()).then(() => {
      if (!alive) return;
      useRibbonStore.getState().hydrate();
      if (template) useRibbonStore.getState().loadTemplate(template);
      if (window.innerWidth < 768) useRibbonStore.getState().setZoom(1.35);
    });
    return () => {
      alive = false;
    };
  }, [template]);

  useEffect(() => {
    const openHelp = () => setHelp(true);
    window.addEventListener("merit-help", openHelp);
    return () => window.removeEventListener("merit-help", openHelp);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menu]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isField(e.target)) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      const s = useRibbonStore.getState();
      const d = s.docs.find((x) => x.id === s.activeId);
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setHelp((h) => !h);
        return;
      }
      if (e.key === "Escape") {
        setHelp(false);
        setMenu(null);
        s.setSelection({ kind: "none" });
        s.setTool("select");
        return;
      }
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        s.redo();
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        s.duplicateSelected();
        return;
      }
      if (mod && key === "g") {
        e.preventDefault();
        if (e.shiftKey) s.ungroupSelected();
        else s.groupSelected();
        return;
      }
      if (mod && key === "c") {
        e.preventDefault();
        s.copySelected();
        return;
      }
      if (mod && key === "v") {
        e.preventDefault();
        s.paste();
        return;
      }
      if (mod && key === "a") {
        e.preventDefault();
        s.selectAll();
        return;
      }
      if (mod && key === "s") {
        e.preventDefault();
        if (d) download(`${slug(d.name)}.png`, exportPng(d, 1, "smooth"));
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        s.removeSelected();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (!s.spaceHeld) s.setSpaceHeld(true);
        return;
      }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        const panView = s.spaceHeld || e.altKey || s.selectedIds.length === 0;
        if (panView) {
          const step = e.shiftKey ? 120 : 40;
          const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
          const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
          s.panBy(dx, dy);
          return;
        }
        const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
        const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
        s.nudgeSelected(dx, dy, e.shiftKey ? s.snap : 0);
        return;
      }
      if (e.key === "[" || e.key === "]") {
        e.preventDefault();
        s.rotateSelected(e.key === "]" ? 15 : -15);
        return;
      }
      if (!mod) {
        const toolKey: Record<string, Tool> = {
          v: "select",
          m: "move",
          l: "marquee",
          b: "brush",
          g: "fill",
          e: "erase",
          i: "eyedrop",
          t: "stamp",
        };
        if (toolKey[key]) {
          e.preventDefault();
          s.setTool(toolKey[key]);
          return;
        }
      }
      if (key === "f" || e.key === "0") {
        e.preventDefault();
        fit();
        return;
      }
      if ((key === "=" || e.key === "+" || e.code === "NumpadAdd") && !mod) {
        e.preventDefault();
        s.setZoom(s.zoom * 1.15);
        return;
      }
      if ((key === "-" || e.code === "NumpadSubtract") && !mod) {
        e.preventDefault();
        s.setZoom(s.zoom / 1.15);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") useRibbonStore.getState().setSpaceHeld(false);
    };
    const clearSpace = () => useRibbonStore.getState().setSpaceHeld(false);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clearSpace);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clearSpace);
    };
  }, []);

  if (!booted || !doc) {
    return (
      <div className="flex h-dvh items-center justify-center overflow-hidden bg-bg text-muted">
        Setting the press…
      </div>
    );
  }

  const name = slug(doc.name);

  return (
    <div className="studio-shell flex h-dvh flex-col overflow-hidden overscroll-none bg-bg text-fg">
      <AppNav />
      <div ref={barRef} className="relative z-40 shrink-0 border-b border-border">
        <div className="flex h-11 items-center gap-1 overflow-x-auto px-2 sm:gap-1.5 sm:px-3">
          <div className="flex shrink-0 items-center rounded-md border border-border">
            {TOOLS.map(({ id, label, hint, Icon }) => (
              <button
                key={id}
                type="button"
                title={`${label} (${hint})`}
                onClick={() => useRibbonStore.getState().setTool(id)}
                className={cn(
                  "inline-flex size-8 items-center justify-center text-muted hover:bg-raised hover:text-fg",
                  tool === id && "bg-raised text-fg",
                )}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" disabled={!past.length} onClick={() => useRibbonStore.getState().undo()} title="Undo">
            <Undo2 className="size-3.5" />
          </Button>
          <Button size="sm" variant="ghost" disabled={!future.length} onClick={() => useRibbonStore.getState().redo()} title="Redo">
            <Redo2 className="size-3.5" />
          </Button>
          <Button size="sm" variant="ghost" title="Duplicate selection" onClick={() => useRibbonStore.getState().duplicateSelected()}>
            <Copy className="size-3.5" />
          </Button>
          <div className="flex shrink-0 items-center rounded-md border border-border">
            <Button size="sm" variant="ghost" onClick={() => useRibbonStore.getState().setZoom(zoom / 1.15)} title="Zoom out">
              <Minus className="size-3.5" />
            </Button>
            <button className="w-14 font-mono text-xs tabular-nums text-muted" onClick={() => useRibbonStore.getState().setZoom(3)} title="Reset zoom">
              {Math.round(zoom * 100)}%
            </button>
            <Button size="sm" variant="ghost" onClick={() => useRibbonStore.getState().setZoom(zoom * 1.15)} title="Zoom in">
              <Plus className="size-3.5" />
            </Button>
          </div>
          <Button size="sm" variant="ghost" onClick={fit} title="Fit (F)">
            <Scan className="size-3.5" />
            <span className="hidden sm:inline">Fit</span>
          </Button>
          <input
            aria-label="Ribbon name"
            value={doc.name}
            onChange={(e) => useRibbonStore.getState().updateDoc({ name: e.target.value })}
            className="h-8 w-36 shrink-0 rounded-md border border-border bg-bg px-2 text-sm text-fg"
          />
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <MenuButton id="templates" menu={menu} setMenu={setMenu}>Templates</MenuButton>
            <MenuButton id="saves" menu={menu} setMenu={setMenu}>Saves</MenuButton>
            <MenuButton id="export" menu={menu} setMenu={setMenu}>Export</MenuButton>
            <MenuButton id="grid" menu={menu} setMenu={setMenu} on={showGrid}>Grid</MenuButton>
            <MenuButton id="view" menu={menu} setMenu={setMenu}>View</MenuButton>
            <MenuButton id="stack" menu={menu} setMenu={setMenu}>Stack</MenuButton>
            <Button size="sm" variant="ghost" onClick={() => setHelp((h) => !h)} title="Shortcuts">
              <Keyboard className="size-3.5" />
            </Button>
          </div>
          <input
            ref={jsonRef}
            type="file"
            accept=".meritpress,.json,application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const loaded = parseMeritFile(JSON.parse(await file.text()));
                if (!loaded) {
                  setFileNote("That file isn’t a Merit Press ribbon.");
                  return;
                }
                useRibbonStore.getState().importDoc(loaded.doc);
                if (loaded.kind === "meritpress-template") {
                  useRibbonStore.getState().keepTemplate(loaded.doc.name);
                }
                setFileNote(null);
              } catch {
                setFileNote("That file isn’t a Merit Press ribbon.");
              }
              e.target.value = "";
              setMenu(null);
            }}
          />
        </div>
        {menu && (
          <div className="absolute right-2 top-full z-50 mt-1 max-h-[min(70vh,36rem)] w-[min(18rem,calc(100vw-1rem))] overflow-y-auto rounded-md border border-border bg-panel p-2 shadow-panel">
            {menu === "templates" && (
              <div className="grid gap-2">
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="secondary" onClick={() => useRibbonStore.getState().keepTemplate(doc.name)}>
                    Keep this ribbon
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      downloadText(`${name}.meritpress.json`, packMerit(doc, "meritpress-template"), "application/json");
                      useRibbonStore.getState().keepTemplate(doc.name);
                      setMenu(null);
                    }}
                  >
                    Export template
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => jsonRef.current?.click()}>
                    <Upload className="size-3.5" />
                    Import
                  </Button>
                </div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Built in</p>
                {templatesForPicker().map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="rounded-[8px] px-2 py-1.5 text-left text-sm text-muted hover:bg-elevated hover:text-fg"
                    onClick={() => {
                      useRibbonStore.getState().loadTemplate(t.id);
                      setMenu(null);
                    }}
                  >
                    {t.name}
                  </button>
                ))}
                <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Yours</p>
                {(userTemplates ?? []).length === 0 && (
                  <p className="text-xs text-subtle">No saved templates yet. Keep this ribbon, or import a .meritpress.json file.</p>
                )}
                {fileNote && <p className="text-xs text-fg">{fileNote}</p>}
                {(userTemplates ?? []).map((t) => (
                  <div key={t.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      className="flex-1 truncate rounded-[8px] px-2 py-1 text-left text-sm text-muted hover:bg-elevated hover:text-fg"
                      onClick={() => {
                        useRibbonStore.getState().loadUserTemplate(t.id);
                        setMenu(null);
                      }}
                    >
                      {t.name}
                    </button>
                    <button type="button" className="text-subtle hover:text-fg" title="Remove template" onClick={() => useRibbonStore.getState().removeUserTemplate(t.id)}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {menu === "saves" && (
              <div className="grid gap-2">
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="secondary" onClick={() => useRibbonStore.getState().saveNamed(doc.name)}>
                    Save locally
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadText(`${name}.meritpress`, packMerit(doc, "meritpress-save"), "application/json")}
                  >
                    Export .meritpress
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => jsonRef.current?.click()}>
                    <Upload className="size-3.5" />
                    Import
                  </Button>
                </div>
                <p className="text-xs text-subtle">A .meritpress file is the ribbon plus its images. Older JSON still opens.</p>
                {fileNote && <p className="text-xs text-fg">{fileNote}</p>}
                <ul className="grid gap-1">
                  {saves.length === 0 && <li className="text-xs text-subtle">No named saves yet.</li>}
                  {saves.map((s) => (
                    <li key={s.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        className="flex-1 truncate rounded-[8px] px-2 py-1 text-left text-xs text-muted hover:bg-elevated hover:text-fg"
                        onClick={() => {
                          useRibbonStore.getState().loadSave(s.id);
                          setMenu(null);
                        }}
                      >
                        {s.name}
                      </button>
                      <button type="button" className="text-subtle hover:text-fg" title="Remove save" onClick={() => useRibbonStore.getState().removeSave(s.id)}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                {docs.length > 1 && (
                  <div className="grid gap-1 border-t border-line pt-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Earlier ribbons</p>
                    {docs.filter((d) => d.id !== doc.id).map((d) => (
                      <div key={d.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          className="flex-1 truncate rounded-[8px] px-2 py-1 text-left text-xs text-muted hover:bg-elevated hover:text-fg"
                          onClick={() => {
                            useRibbonStore.getState().setActive(d.id);
                            setMenu(null);
                          }}
                        >
                          {d.name}
                        </button>
                        <button type="button" className="text-subtle hover:text-fg" title="Remove" onClick={() => useRibbonStore.getState().removeDoc(d.id)}>
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {menu === "export" && (
              <div className="grid gap-1">
                <Button size="sm" className="justify-start" onClick={() => { download(`${name}.png`, exportPng(doc, 1, "smooth")); setMenu(null); }}>Forum PNG</Button>
                <Button size="sm" variant="secondary" className="justify-start" onClick={() => { download(`${name}@4x.png`, exportPng(doc, 4, "smooth")); setMenu(null); }}>4×</Button>
                <Button size="sm" variant="secondary" className="justify-start" onClick={() => { download(`${name}@8x.png`, exportPng(doc, 8, "smooth")); setMenu(null); }}>8×</Button>
                <Button size="sm" variant="secondary" className="justify-start" onClick={() => { downloadText(`${name}.svg`, exportSvg(doc), "image/svg+xml"); setMenu(null); }}>SVG</Button>
                <Button size="sm" variant="ghost" className="justify-start" onClick={() => { downloadText(`${name}.meritpress`, packMerit(doc, "meritpress-save"), "application/json"); setMenu(null); }}>.meritpress</Button>
                <Button size="sm" variant="ghost" className="justify-start" onClick={() => { downloadText(`${name}.meritpress.json`, packMerit(doc, "meritpress-template"), "application/json"); setMenu(null); }}>Template</Button>
              </div>
            )}
            {menu === "grid" && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-fg">Grid on the ribbon</p>
                  <Button size="sm" variant={showGrid ? "secondary" : "ghost"} onClick={() => useRibbonStore.getState().toggleGrid()}>
                    {showGrid ? "On" : "Off"}
                  </Button>
                </div>
                <p className="text-xs text-subtle">The ruler on the edge of the artboard stays on. This only draws the overlay across the ribbon.</p>
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={doc.grid.adaptive}
                    onChange={(e) => useRibbonStore.getState().updateDoc({ grid: { ...doc.grid, adaptive: e.target.checked } })}
                  />
                  Adaptive contrast
                </label>
                <Field label={`Opacity ${Math.round(doc.grid.opacity * 100)}`}>
                  <Range min={0} max={1} step={0.01} value={doc.grid.opacity} onChange={(e) => useRibbonStore.getState().updateDoc({ grid: { ...doc.grid, opacity: Number(e.target.value) } })} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Color">
                    <Input type="color" className="p-1" value={hexOr(doc.grid.color)} onChange={(e) => useRibbonStore.getState().updateDoc({ grid: { ...doc.grid, color: e.target.value } })} />
                  </Field>
                  <Field label="Size px">
                    <Input type="number" step={0.01} min={0.25} value={doc.grid.size} onChange={(e) => useRibbonStore.getState().updateDoc({ grid: { ...doc.grid, size: Number(e.target.value) || 1 } })} />
                  </Field>
                </div>
              </div>
            )}
            {menu === "view" && (
              <div className="grid gap-2">
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant={showGuides ? "secondary" : "ghost"} onClick={() => useRibbonStore.getState().toggleGuides()}>Guides</Button>
                  <Button size="sm" variant="ghost" onClick={fit}>Fit</Button>
                  <Button size="sm" variant="secondary" onClick={() => useRibbonStore.getState().smartSnap()}>Smart snap</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label={`Zoom ${Math.round(zoom * 100)}%`}>
                    <Range min={0.25} max={48} step={0.05} value={zoom} onChange={(e) => useRibbonStore.getState().setZoom(Number(e.target.value))} />
                  </Field>
                  <Field label="Snap">
                    <Input type="number" step={0.01} min={0} value={snap} onChange={(e) => useRibbonStore.getState().setSnap(Number(e.target.value) || 0)} />
                  </Field>
                </div>
                <div className="grid gap-2 border-t border-line pt-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Flatten</p>
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={doc.flatten.enabled}
                      onChange={(e) => useRibbonStore.getState().updateDoc({ flatten: { ...doc.flatten, enabled: e.target.checked } })}
                    />
                    Snap to palette / levels
                  </label>
                  <Field label="Levels">
                    <Input type="number" min={2} max={32} value={doc.flatten.levels} onChange={(e) => useRibbonStore.getState().updateDoc({ flatten: { ...doc.flatten, levels: Number(e.target.value) || 8 } })} />
                  </Field>
                </div>
              </div>
            )}
            {menu === "stack" && <Stacker doc={doc} />}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <LeftPanel />
        <RibbonCanvas />
        <RightPanel />
      </div>

      {help && <Shortcuts onClose={() => setHelp(false)} />}
    </div>
  );
}

function MenuButton({
  id,
  menu,
  setMenu,
  children,
  on,
}: {
  id: Exclude<MenuId, null>;
  menu: MenuId;
  setMenu: (id: MenuId) => void;
  children: string;
  on?: boolean;
}) {
  return (
    <Button size="sm" variant={menu === id || on ? "secondary" : "ghost"} onClick={() => setMenu(menu === id ? null : id)}>
      {children}
    </Button>
  );
}

function hexOr(v: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : "#000000";
}

function fit() {
  const wrap = document.querySelector("[data-canvas-well]");
  if (!wrap) return;
  const r = wrap.getBoundingClientRect();
  useRibbonStore.getState().fitZoom(r.width, r.height);
}

function isField(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}

function Shortcuts({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ["Undo / Redo", "⌘Z · ⌘⇧Z"],
    ["Duplicate", "⌘D"],
    ["Copy / Paste", "⌘C · ⌘V"],
    ["Select all", "⌘A"],
    ["Group / Ungroup", "⌘G · ⌘⇧G"],
    ["Forum PNG", "⌘S"],
    ["Delete", "⌫"],
    ["Nudge 1px / snap", "↑↓←→ · ⇧ arrows (with a layer)"],
    ["Snap while dragging", "Hold ⇧"],
    ["Pan view", "Space-drag · empty well · Space+arrows"],
    ["Rotate 15°", "[ ]"],
    ["Select / Move", "V · M"],
    ["Marquee / Brush", "L · B"],
    ["Fill / Erase", "G · E"],
    ["Eyedrop / Stamp", "I · T"],
    ["Zoom in / out", "+ · − · mouse wheel"],
    ["Fit (reset pan)", "F · 0"],
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg">Shortcuts</h2>
        <ul className="mt-3 grid gap-1.5">
          {rows.map(([label, keys]) => (
            <li key={label} className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-muted">{label}</span>
              <span className="font-mono text-[11px] text-subtle">{keys}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-subtle">Press ? to toggle. Esc closes. Grab empty space or hold Space to pan; zoom does not shrink the bar to fit.</p>
      </div>
    </div>
  );
}
