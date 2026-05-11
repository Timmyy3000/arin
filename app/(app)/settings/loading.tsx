export default function SettingsLoading() {
  return (
    <div className="max-w-[480px] space-y-5">
      <div className="h-5 w-32 animate-pulse rounded bg-surface-hover" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="space-y-1.5"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="h-3 w-24 animate-pulse rounded bg-surface-hover" />
          <div className="h-9 w-full animate-pulse rounded-md bg-surface-hover" />
        </div>
      ))}
    </div>
  );
}
