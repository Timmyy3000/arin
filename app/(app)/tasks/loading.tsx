export default function TasksLoading() {
  return (
    <div className="flex h-full flex-col bg-background">
      <header className="shrink-0 border-b border-border px-6 py-3.5">
        <div className="flex items-center justify-between">
          <div className="h-5 w-20 animate-pulse rounded bg-surface-hover" />
          <div className="flex gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-7 w-16 animate-pulse rounded bg-surface-hover" />
            ))}
          </div>
        </div>
      </header>
      <div className="flex-1 space-y-0.5 overflow-hidden px-2 py-2">
        {Array.from({ length: 4 }).map((_, group) => (
          <div key={group} className="space-y-0.5">
            <div className="px-3.5 pb-1 pt-3">
              <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex h-11 items-center gap-3 rounded-md px-3.5"
                style={{ animationDelay: `${(group * 3 + i) * 30}ms` }}
              >
                <div className="h-4 w-4 animate-pulse rounded-sm bg-surface-hover" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-surface-hover" />
                  <div className="h-2.5 w-1/3 animate-pulse rounded bg-surface-hover" />
                </div>
                <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
