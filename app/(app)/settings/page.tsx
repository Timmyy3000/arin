import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organization } from "@/db/schema/auth";
import { requireOrgSession } from "@/lib/session";

export default async function GeneralSettingsPage() {
  const session = await requireOrgSession();
  const orgRows = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, session.organizationId))
    .limit(1);
  const org = orgRows[0]!;
  return (
    <div className="max-w-[480px]">
      <h2
        className="mb-5 text-base font-semibold tracking-tight text-text"
        style={{ fontFamily: "var(--font-display)" }}
      >
        General
      </h2>
      {[
        { label: "Organization name", value: org.name },
        { label: "Slug", value: org.slug, mono: true },
      ].map((row) => (
        <div key={row.label} className="mb-4">
          <label className="mb-1.5 block text-[12px] text-text-muted">{row.label}</label>
          <input
            defaultValue={row.value}
            className={
              row.mono
                ? "h-[34px] w-full rounded-md border border-border bg-surface-hover px-2.5 font-mono text-[13px] text-text outline-none"
                : "h-[34px] w-full rounded-md border border-border bg-surface-hover px-2.5 text-[13px] text-text outline-none"
            }
            readOnly
          />
        </div>
      ))}
      <div className="mb-4">
        <label className="mb-1.5 block text-[12px] text-text-muted">Theme</label>
        <div className="flex gap-2">
          {[
            { label: "Dark", active: true },
            { label: "Light", active: false },
            { label: "System", active: false },
          ].map((t) => (
            <span
              key={t.label}
              className={
                t.active
                  ? "rounded-md border border-accent bg-accent-subtle px-3.5 py-1 text-[12px] text-accent"
                  : "rounded-md border border-border bg-surface-hover px-3.5 py-1 text-[12px] text-text-muted"
              }
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-text-subtle">
        Editing organization settings lands in Phase 4.
      </p>
    </div>
  );
}
