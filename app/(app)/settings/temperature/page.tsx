export default function TemperatureSettingsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-medium">Temperature decay</h2>
      <p className="text-sm text-muted-foreground">
        Daily cron recomputes <code>companies.temperature</code> based on
        <code> last_signal_at</code>. After <code>X</code> days without a signal, drop the
        temperature by <code>Y</code>.
      </p>
      <p className="text-xs text-muted-foreground">
        Configurable inputs and last-run timestamp land in Phase 4 (cron + polish).
      </p>
    </div>
  );
}
