export default function AppLoading() {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="h-[3px] shrink-0 animate-pulse bg-border-subtle" />
      <header className="shrink-0 border-b border-border px-6 py-3.5">
        <div className="h-5 w-48 animate-pulse rounded bg-surface-hover" />
        <div className="mt-2 h-3 w-72 animate-pulse rounded bg-surface-hover" />
      </header>
      <div className="flex-1 space-y-2 overflow-hidden px-6 py-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-full animate-pulse rounded bg-surface-hover"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
