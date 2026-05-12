export default function CompaniesLoading() {
  return (
    <div className="flex h-full flex-col bg-background">
      <header className="shrink-0 border-b border-border px-6 py-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="h-5 w-32 animate-pulse rounded bg-surface-hover" />
          <div className="h-3 w-20 animate-pulse rounded bg-surface-hover" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-[30px] w-[260px] animate-pulse rounded-md bg-surface-hover" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-7 w-14 animate-pulse rounded bg-surface-hover"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="border-b border-border bg-surface">
            <tr>
              {Array.from({ length: 7 }).map((_, i) => (
                <th key={i} className="px-3.5 py-2 text-left">
                  <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr
                key={i}
                className="border-b border-border-subtle"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <td className="px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 animate-pulse rounded bg-surface-hover" />
                    <div className="space-y-1">
                      <div className="h-3 w-28 animate-pulse rounded bg-surface-hover" />
                      <div className="h-2.5 w-20 animate-pulse rounded bg-surface-hover" />
                    </div>
                  </div>
                </td>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-3.5 py-2.5">
                    <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
