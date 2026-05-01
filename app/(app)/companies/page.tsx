import Link from "next/link";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { Search } from "lucide-react";
import { db } from "@/db/client";
import { companies } from "@/db/schema/companies";
import { signals } from "@/db/schema/signals";
import { tasks } from "@/db/schema/tasks";
import { ActivityBars } from "@/components/activity-bars";
import { CompanyLogo } from "@/components/avatar-init";
import { TemperaturePill } from "@/components/pills";
import { isoDay, relativeTime, thirtyDayWindow } from "@/lib/format";
import { requireOrgSession } from "@/lib/session";

const TEMP_FILTERS = [
  { v: "all", label: "All" },
  { v: "cold", label: "Cold" },
  { v: "warm", label: "Warm" },
  { v: "hot", label: "Hot" },
  { v: "on_fire", label: "On Fire" },
] as const;

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ temp?: string; q?: string }>;
}) {
  const session = await requireOrgSession();
  const orgId = session.organizationId;
  const sp = await searchParams;
  const tempFilter = (sp.temp ?? "all") as (typeof TEMP_FILTERS)[number]["v"];

  const where =
    tempFilter !== "all"
      ? and(eq(companies.organizationId, orgId), eq(companies.temperature, tempFilter))
      : eq(companies.organizationId, orgId);

  const rows = await db()
    .select({
      id: companies.id,
      name: companies.name,
      domain: companies.domain,
      industry: companies.industry,
      employeeCount: companies.employeeCount,
      temperature: companies.temperature,
      lastSignalAt: companies.lastSignalAt,
    })
    .from(companies)
    .where(where)
    .orderBy(desc(companies.lastSignalAt));

  const { now, since } = thirtyDayWindow();
  const signalBuckets = await db()
    .select({
      companyId: signals.companyId,
      day: sql<string>`date_trunc('day', ${signals.occurredAt})::date`.as("day"),
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(signals)
    .where(and(eq(signals.organizationId, orgId), gte(signals.occurredAt, since)))
    .groupBy(signals.companyId, sql`date_trunc('day', ${signals.occurredAt})::date`);

  const sparkByCompany = new Map<string, number[]>();
  const buckets = new Map<string, Map<string, number>>();
  for (const b of signalBuckets) {
    const inner = buckets.get(b.companyId) ?? new Map<string, number>();
    inner.set(b.day, b.count);
    buckets.set(b.companyId, inner);
  }
  for (const r of rows) {
    const inner = buckets.get(r.id) ?? new Map<string, number>();
    const arr: number[] = [];
    for (let i = 29; i >= 0; i--) {
      arr.push(inner.get(isoDay(now - i * 86_400_000)) ?? 0);
    }
    sparkByCompany.set(r.id, arr);
  }

  const taskCounts = await db()
    .select({
      companyId: tasks.companyId,
      open: sql<number>`count(*)::int`.as("open"),
    })
    .from(tasks)
    .where(and(eq(tasks.organizationId, orgId), eq(tasks.status, "open")))
    .groupBy(tasks.companyId);
  const tasksByCompany = new Map(
    taskCounts.filter((t) => t.companyId).map((t) => [t.companyId!, t.open]),
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="shrink-0 border-b border-border px-6 py-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <h1
            className="text-base font-semibold tracking-tight text-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Companies
          </h1>
          <span className="text-[12px] text-text-subtle">
            {rows.length} accounts
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative max-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-text-subtle" />
            <input
              placeholder="Search companies…"
              className="h-[30px] w-full rounded-md border border-border bg-surface-hover pl-8 pr-2 text-[12px] text-text outline-none placeholder:text-text-subtle focus:border-accent"
            />
          </div>
          {TEMP_FILTERS.map((f) => (
            <Link
              key={f.v}
              href={f.v === "all" ? "/companies" : `/companies?temp=${f.v}`}
              className={
                f.v === tempFilter
                  ? "rounded-[4px] border border-accent bg-accent-subtle px-2.5 py-1 text-[11px] text-accent"
                  : "rounded-[4px] border border-border bg-surface-hover px-2.5 py-1 text-[11px] text-text-muted hover:text-text"
              }
            >
              {f.label}
            </Link>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="m-6 rounded-md border border-dashed border-border p-12 text-center text-[13px] text-text-muted">
            No companies yet. Run <code className="text-xs">bun run seed:sample</code> or
            connect Claude via MCP.
          </div>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface">
              <tr>
                {["Company", "Stage / Industry", "Temperature", "30d Activity", "Last signal", "Tasks", "ARR"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3.5 py-2 text-left text-[11px] font-medium text-text-subtle"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b border-border-subtle transition hover:bg-surface-hover"
                >
                  <td className="px-3.5 py-2">
                    <Link
                      href={`/companies/${r.id}`}
                      className="flex items-center gap-2.5"
                    >
                      <CompanyLogo name={r.name} size={24} />
                      <div>
                        <div className="text-[13px] font-medium leading-tight text-text">
                          {r.name}
                        </div>
                        <div className="text-[11px] text-text-subtle">
                          {r.domain ?? ""}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3.5 py-2">
                    <div className="text-[12px] text-text-muted">
                      {r.industry ?? "—"}
                    </div>
                    <div className="text-[11px] text-text-subtle">
                      {r.employeeCount?.toLocaleString() ?? "—"} employees
                    </div>
                  </td>
                  <td className="px-3.5 py-2">
                    <TemperaturePill value={r.temperature} />
                  </td>
                  <td className="px-3.5 py-2">
                    <ActivityBars data={sparkByCompany.get(r.id) ?? []} width={88} height={22} />
                  </td>
                  <td className="px-3.5 py-2 text-[11px] text-text-subtle">
                    {relativeTime(r.lastSignalAt)}
                  </td>
                  <td className="px-3.5 py-2">
                    {(tasksByCompany.get(r.id) ?? 0) > 0 ? (
                      <span className="text-[12px] font-medium text-accent">
                        {tasksByCompany.get(r.id)}
                      </span>
                    ) : (
                      <span className="text-[12px] text-text-subtle">—</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2 font-mono text-[11px] text-text-subtle">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
