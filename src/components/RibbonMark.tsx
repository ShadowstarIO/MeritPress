export function RibbonMark({ className = "h-5 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 14" className={className} aria-hidden="true">
      <rect width="40" height="14" rx="1.5" fill="#1a1c22" />
      <rect x="0" y="0" width="7" height="14" fill="#2F4FA8" />
      <rect x="7" y="0" width="9" height="14" fill="#EDECEA" />
      <rect x="16" y="0" width="8" height="14" fill="#12141A" />
      <rect x="24" y="0" width="9" height="14" fill="#EDECEA" />
      <rect x="33" y="0" width="7" height="14" fill="#B33B3F" />
    </svg>
  );
}
