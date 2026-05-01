const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

export function relativeTime(date: Date | null | undefined): string {
  if (!date) return "—";
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  for (const [unit, ms] of UNITS) {
    if (abs >= ms) {
      return RELATIVE.format(Math.round(diff / ms), unit);
    }
  }
  return RELATIVE.format(Math.round(diff / 1000), "second");
}

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function thirtyDayWindow(): { now: number; since: Date } {
  const now = Date.now();
  return { now, since: new Date(now - 30 * 24 * 60 * 60 * 1000) };
}

export function isoDay(epoch: number): string {
  return new Date(epoch).toISOString().slice(0, 10);
}

export function money(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  if (Number.isNaN(n)) return "—";
  return MONEY.format(n);
}
