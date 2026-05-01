import { requireSession } from "@/lib/session";

export default async function AccountSettingsPage() {
  const session = await requireSession();
  return (
    <div className="max-w-[420px] space-y-4">
      <h2
        className="text-base font-semibold tracking-tight text-text"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Account
      </h2>
      {[
        { label: "Full name", value: session.user.name ?? "" },
        { label: "Email", value: session.user.email },
      ].map((row) => (
        <div key={row.label}>
          <label className="mb-1.5 block text-[12px] text-text-muted">{row.label}</label>
          <input
            defaultValue={row.value}
            className="h-[34px] w-full rounded-md border border-border bg-surface-hover px-2.5 text-[13px] text-text outline-none"
            readOnly
          />
        </div>
      ))}
      <p className="text-[11px] text-text-subtle">
        Editing profile + password change land in Phase 4.
      </p>
    </div>
  );
}
