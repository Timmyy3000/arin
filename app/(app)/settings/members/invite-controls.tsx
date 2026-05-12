"use client";

import { useState, useTransition } from "react";
import { Copy, Trash2 } from "lucide-react";
import {
  createInviteLinkAction,
  revokeInviteLinkAction,
} from "./actions";

export type ActiveInviteRow = {
  token: string;
  url: string;
  createdAt: string;
  expiresAt: string;
};

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function InviteControls({
  appUrl,
  active,
  canManage,
}: {
  appUrl: string;
  active: ActiveInviteRow[];
  canManage: boolean;
}) {
  const [creating, startCreating] = useTransition();
  const [revoking, startRevoking] = useTransition();
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied((c) => (c === url ? null : c)), 1500);
    } catch {
      setError("Couldn't copy to clipboard. Select the link and copy manually.");
    }
  }

  function onCreate() {
    setError(null);
    setJustCreated(null);
    startCreating(async () => {
      try {
        const { url } = await createInviteLinkAction();
        setJustCreated(url);
        await copy(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create invite link.");
      }
    });
  }

  function onRevoke(token: string) {
    setError(null);
    startRevoking(async () => {
      try {
        await revokeInviteLinkAction(token);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to revoke invite link.");
      }
    });
  }

  if (!canManage) {
    return (
      <p className="text-[11px] text-text-subtle">
        Only workspace admins can manage invite links.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onCreate}
        disabled={creating}
        className="h-[30px] rounded-md bg-accent px-3 text-[12px] font-medium text-white transition disabled:opacity-60"
      >
        {creating ? "Generating…" : "Generate invite link"}
      </button>

      {error ? (
        <div
          className="rounded-md border px-2.5 py-2 text-[12px]"
          style={{
            color: "oklch(0.62 0.18 25)",
            background: "oklch(0.18 0.04 25 / 0.6)",
            borderColor: "oklch(0.25 0.08 25)",
          }}
        >
          {error}
        </div>
      ) : null}

      {justCreated ? (
        <div className="rounded-md border border-accent bg-accent-subtle px-3 py-2.5">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
            New invite link — copied to clipboard
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate font-mono text-[11px] text-text">
              {justCreated}
            </code>
            <button
              type="button"
              onClick={() => copy(justCreated)}
              className="flex h-7 items-center gap-1 rounded border border-border bg-background px-2 text-[11px] text-text-muted transition hover:text-text"
            >
              <Copy className="h-3 w-3" />
              {copied === justCreated ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-text-subtle">
            Single-use · expires in 7 days · share once and it burns on first acceptance.
          </p>
        </div>
      ) : null}

      {active.length > 0 ? (
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
            Active invite links
          </div>
          <ul className="space-y-1.5">
            {active.map((row) => {
              const days = daysUntil(row.expiresAt);
              return (
                <li
                  key={row.token}
                  className="flex items-center gap-2 rounded-md border border-border bg-surface-hover px-3 py-2"
                >
                  <code className="flex-1 truncate font-mono text-[11px] text-text-muted">
                    {row.url.replace(`${appUrl}/invite/`, "…/invite/")}
                  </code>
                  <span className="text-[11px] text-text-subtle">
                    {days === 0 ? "expires today" : `expires in ${days}d`}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(row.url)}
                    className="flex h-7 items-center gap-1 rounded border border-border bg-background px-2 text-[11px] text-text-muted transition hover:text-text"
                  >
                    <Copy className="h-3 w-3" />
                    {copied === row.url ? "Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRevoke(row.token)}
                    disabled={revoking}
                    className="flex h-7 items-center gap-1 rounded border border-border bg-background px-2 text-[11px] text-text-muted transition hover:text-text disabled:opacity-60"
                  >
                    <Trash2 className="h-3 w-3" />
                    Revoke
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
