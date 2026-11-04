import { RibbonMark } from "./RibbonMark";

export function AppNav() {
  return (
    <header className="shrink-0 border-b border-border bg-bg">
      <div className="flex h-11 items-center gap-3 px-3 sm:h-12 sm:px-4">
        <RibbonMark className="h-4 w-8 shrink-0 sm:h-5 sm:w-10" />
        <div className="min-w-0">
          <p className="font-display truncate text-base leading-tight tracking-tight sm:text-lg">
            Merit Press
          </p>
          <p className="hidden text-[10px] uppercase tracking-[0.18em] text-subtle sm:block">
            Award ribbon studio
          </p>
        </div>
        <a href="https://press.shadowstar.io/id" className="ml-auto text-sm text-subtle">
          ID
        </a>
      </div>
    </header>
  );
}
