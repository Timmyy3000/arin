"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-[420px] rounded-xl border border-border bg-surface px-7 py-6">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
          Error
        </div>
        <h2
          className="mb-1.5 text-[20px] font-semibold tracking-tight text-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Something went wrong.
        </h2>
        <p className="mb-5 text-[13px] leading-relaxed text-text-muted">
          {error.message || "An unexpected error occurred."}
          {error.digest ? (
            <span className="ml-1 font-mono text-[11px] text-text-subtle">
              ({error.digest})
            </span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={unstable_retry}
          className="h-9 rounded-md bg-accent px-4 text-[13px] font-medium text-white transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
