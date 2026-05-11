export default function CompanyDetailLoading() {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="shrink-0 border-b border-border px-6 pt-3.5">
        <div className="mb-2.5 flex items-center gap-2">
          <div className="h-3 w-20 animate-pulse rounded bg-surface-hover" />
          <span className="text-text-subtle">/</span>
          <div className="h-3 w-32 animate-pulse rounded bg-surface-hover" />
        </div>
        <div className="mb-3 flex items-start gap-3">
          <div className="h-9 w-9 animate-pulse rounded-md bg-surface-hover" />
          <div className="flex-1 space-y-1.5">
            <div className="h-6 w-48 animate-pulse rounded bg-surface-hover" />
            <div className="h-3 w-64 animate-pulse rounded bg-surface-hover" />
          </div>
        </div>
        <nav className="-mb-px flex gap-0">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="border-b-2 border-transparent px-3.5 py-2">
              <div className="h-3 w-14 animate-pulse rounded bg-surface-hover" />
            </div>
          ))}
        </nav>
      </div>
      <div className="grid flex-1 gap-6 overflow-hidden px-6 py-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <div className="h-3 w-full max-w-[480px] animate-pulse rounded bg-surface-hover" />
          <div className="h-3 w-3/4 max-w-[420px] animate-pulse rounded bg-surface-hover" />
          <div className="h-24 w-full animate-pulse rounded-md bg-surface-hover" />
          <div className="space-y-2">
            <div className="h-3 w-32 animate-pulse rounded bg-surface-hover" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-full animate-pulse rounded bg-surface-hover"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-32 w-full animate-pulse rounded-md bg-surface-hover" />
          <div className="h-24 w-full animate-pulse rounded-md bg-surface-hover" />
        </div>
      </div>
    </div>
  );
}
