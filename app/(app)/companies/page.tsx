import { and, desc, eq, gte, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { companies } from "@/db/schema/companies";
import { signals } from "@/db/schema/signals";
import { tasks } from "@/db/schema/tasks";
import { TemperaturePill } from "@/components/pills";
import { Sparkline } from "@/components/sparkline";
import { relativeTime } from "@/lib/format";
import { requireOrgSession } from "@/lib/session";

export default async function CompaniesPage() {
  const session = await requireOrgSession();
  const orgId = session.organizationId;

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
    .where(eq(companies.organizationId, orgId))
    .orderBy(desc(companies.lastSignalAt));

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
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
      const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      arr.push(inner.get(day) ?? 0);
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
  const tasksByCompany = new Map(taskCounts.filter((t) => t.companyId).map((t) => [t.companyId!, t.open]));

  return (
    <div className="px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} compan{rows.length === 1 ? "y" : "ies"}
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No companies yet. Run <code className="text-xs">bun run seed:sample</code> to load sample data
          or connect Claude via MCP.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Industry</th>
                <th className="px-4 py-2 font-medium text-right">Employees</th>
                <th className="px-4 py-2 font-medium">Temperature</th>
                <th className="px-4 py-2 font-medium">30-day signals</th>
                <th className="px-4 py-2 font-medium">Last signal</th>
                <th className="px-4 py-2 font-medium text-right">Open tasks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={i > 0 ? "border-t border-border/60" : ""}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/companies/${r.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {r.name}
                    </Link>
                    {r.domain ? (
                      <div className="text-xs text-muted-foreground">{r.domain}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.industry ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {r.employeeCount?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <TemperaturePill value={r.temperature} />
                  </td>
                  <td className="px-4 py-3">
                    <Sparkline values={sparkByCompany.get(r.id) ?? []} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{relativeTime(r.lastSignalAt)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {tasksByCompany.get(r.id) ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
