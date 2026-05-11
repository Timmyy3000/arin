export default function DealsLoading() {
  return (
    <div className="flex h-full flex-col bg-background">
      <header className="shrink-0 border-b border-border px-6 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-5 w-24 animate-pulse rounded bg-surface-hover" />
            <div className="mt-1.5 h-3 w-44 animate-pulse rounded bg-surface-hover" />
          </div>
          <div className="flex gap-1.5">
            <div className="h-7 w-16 animate-pulse rounded bg-surface-hover" />
            <div className="h-7 w-16 animate-pulse rounded bg-surface-hover" />
          </div>
        </div>
      </header>
      <div className="flex-1 space-y-1.5 overflow-hidden px-6 py-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="grid h-11 grid-cols-[1fr_140px_100px_120px_80px] gap-3 rounded-md border border-border-subtle px-3 py-2"
            style={{ animationDelay: `${i * 35}ms` }}
          >
            <div className="h-3 w-40 animate-pulse self-center rounded bg-surface-hover" />
            <div className="h-3 w-24 animate-pulse self-center rounded bg-surface-hover" />
            <div className="h-3 w-16 animate-pulse self-center rounded bg-surface-hover" />
            <div className="h-3 w-20 animate-pulse self-center rounded bg-surface-hover" />
            <div className="h-3 w-12 animate-pulse self-center rounded bg-surface-hover" />
          </div>
        ))}
      </div>
    </div>
  );
}
