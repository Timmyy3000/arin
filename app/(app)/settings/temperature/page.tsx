export default function TemperatureSettingsPage() {
  return (
    <div className="max-w-[420px] space-y-5">
      <h2
        className="text-base font-semibold tracking-tight text-text"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Temperature
      </h2>
      {[
        {
          label: "Decay days",
          value: 7,
          sub: "Days of inactivity before temperature drops one level",
        },
        {
          label: "Decay amount",
          value: 1,
          sub: "Levels to drop per decay cycle",
        },
      ].map((row) => (
        <div key={row.label}>
          <label className="mb-1 block text-[12px] font-medium text-text">
            {row.label}
          </label>
          <p className="mb-2 text-[11px] text-text-subtle">{row.sub}</p>
          <input
            type="number"
            defaultValue={row.value}
            className="h-8 w-20 rounded-md border border-border bg-surface-hover px-2.5 text-[13px] text-text outline-none"
            readOnly
          />
        </div>
      ))}
      <div className="text-[12px] text-text-subtle">
        Last cron run:{" "}
        <span className="font-mono text-text-muted">never (Phase 4)</span>
      </div>
    </div>
  );
}
