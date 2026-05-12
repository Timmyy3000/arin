import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-[420px] rounded-xl border border-border bg-surface px-7 py-6">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
          404
        </div>
        <h2
          className="mb-1.5 text-[20px] font-semibold tracking-tight text-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Page not found.
        </h2>
        <p className="mb-5 text-[13px] leading-relaxed text-text-muted">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-[13px] font-medium text-white transition"
        >
          Back to cockpit
        </Link>
      </div>
    </div>
  );
}
