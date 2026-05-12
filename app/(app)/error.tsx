"use client";

import { useEffect } from "react";

export default function AppError({
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
    <div className="flex h-full items-center justify-center bg-background px-6">
      <div className="w-[420px] rounded-xl border border-border bg-surface px-6 py-5">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
          This page hit an error
        </div>
        <p className="mb-4 text-[13px] leading-relaxed text-text-muted">
          {error.message || "Something went wrong loading this page."}
          {error.digest ? (
            <span className="ml-1 font-mono text-[11px] text-text-subtle">
              ({error.digest})
            </span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={unstable_retry}
          className="h-8 rounded-md bg-accent px-3 text-[12px] font-medium text-white transition"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
