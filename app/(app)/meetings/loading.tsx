export default function MeetingsLoading() {
  return (
    <div className="flex h-full flex-col bg-background">
      <header className="shrink-0 border-b border-border px-6 py-3.5">
        <div className="h-5 w-24 animate-pulse rounded bg-surface-hover" />
      </header>
      <div className="flex-1 space-y-2 overflow-hidden px-6 py-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-md border border-border-subtle px-4 py-3"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="h-3.5 w-56 animate-pulse rounded bg-surface-hover" />
              <div className="h-3 w-20 animate-pulse rounded bg-surface-hover" />
            </div>
            <div className="mb-2 h-3 w-40 animate-pulse rounded bg-surface-hover" />
            <div className="flex -space-x-1.5">
              {Array.from({ length: 4 }).map((_, j) => (
                <div
                  key={j}
                  className="h-5 w-5 animate-pulse rounded-full border border-background bg-surface-hover"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
