"use client";

import { useState } from "react";
import { relativeTime } from "@/lib/format";
import type { SerializableAuditRow } from "./entity-audit";

function actorLabel(row: SerializableAuditRow): string {
  if (row.actorType === "user") return row.actorUserName ?? "Unknown user";
  if (row.actorType === "service_token") {
    const tokenSuffix = row.actorTokenName ? ` (${row.actorTokenName})` : "";
    if (row.actorUserName) return `${row.actorUserName}'s Claude${tokenSuffix}`;
    return `Service token${tokenSuffix}`;
  }
  if (row.actorType === "oauth_jwt") {
    if (row.actorUserName) return `${row.actorUserName}'s Claude (web)`;
    return row.actorClientId ?? "OAuth client";
  }
  return "Unknown";
}

function changedKeys(row: SerializableAuditRow): string[] {
  const c = row.changes;
  if (!c) return [];
  if ("after" in c && "before" in c) {
    return Array.from(new Set([...Object.keys(c.before), ...Object.keys(c.after)]));
  }
  if ("after" in c) return Object.keys(c.after);
  if ("before" in c) return Object.keys(c.before);
  return [];
}

function summarize(row: SerializableAuditRow): string {
  if (row.action === "create") return "Created";
  if (row.action === "delete") return "Deleted";
  const keys = changedKeys(row);
  if (keys.length === 0) return "Updated";
  if (keys.length <= 3) return `Updated ${keys.join(", ")}`;
  return `Updated ${keys.slice(0, 3).join(", ")} +${keys.length - 3} more`;
}

export function EntityAuditClient({ rows }: { rows: SerializableAuditRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const created = rows[rows.length - 1];
  const updates = rows.filter((r) => r.action === "update");
  const latestUpdate = updates[0];

  return (
    <section className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-[12px]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left text-text-subtle hover:text-text"
      >
        <span>
          Created by{" "}
          <span className="text-text">{actorLabel(created)}</span>{" "}
          {relativeTime(new Date(created.createdAt))}
          {updates.length > 0 ? (
            <>
              {" "}
              • {updates.length} update{updates.length === 1 ? "" : "s"}
              {latestUpdate ? (
                <>
                  , latest by{" "}
                  <span className="text-text">{actorLabel(latestUpdate)}</span>{" "}
                  {relativeTime(new Date(latestUpdate.createdAt))}
                </>
              ) : null}
            </>
          ) : null}
        </span>
        <span className="text-[11px] text-text-subtle">{expanded ? "hide" : "show all"}</span>
      </button>

      {expanded ? (
        <ul className="mt-2 space-y-1.5 border-t border-border-subtle pt-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3">
              <span className="flex-1 text-text">
                {summarize(r)}{" "}
                <span className="text-text-subtle">— {actorLabel(r)}</span>
              </span>
              <span className="shrink-0 text-[11px] text-text-subtle">
                {relativeTime(new Date(r.createdAt))}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
