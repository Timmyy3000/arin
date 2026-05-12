import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="flex h-full items-center justify-center bg-background px-6">
      <div className="w-[420px] rounded-xl border border-border bg-surface px-6 py-5">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
          404
        </div>
        <p className="mb-4 text-[13px] leading-relaxed text-text-muted">
          We couldn&apos;t find that. It may have been deleted, or it belongs to a different
          workspace.
        </p>
        <Link
          href="/"
          className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-[12px] font-medium text-white transition"
        >
          Back to cockpit
        </Link>
      </div>
    </div>
  );
}
