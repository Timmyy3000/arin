import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { companies } from "@/db/schema/companies";
import { TemperaturePill } from "@/components/pills";
import { CompanyTabs } from "./tabs";
import { requireOrgSession } from "@/lib/session";

export default async function CompanyDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await requireOrgSession();
  const { id } = await params;

  const rows = await db()
    .select()
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);
  const company = rows[0];
  if (!company || company.organizationId !== session.organizationId) notFound();

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <header className="border-b border-border/60 px-8 py-5">
          <Link
            href="/companies"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            ← Companies
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
            <TemperaturePill value={company.temperature} />
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            {company.domain ? <span>{company.domain}</span> : null}
            {company.industry ? <span>· {company.industry}</span> : null}
            {company.employeeCount ? (
              <span>· {company.employeeCount.toLocaleString()} employees</span>
            ) : null}
          </div>
        </header>
        <CompanyTabs companyId={company.id} />
        <div className="px-8 py-6">{children}</div>
      </div>
      <aside className="hidden w-64 shrink-0 border-l border-border/60 bg-muted/10 p-5 lg:block">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Properties
        </h3>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Domain</dt>
            <dd>{company.domain ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Industry</dt>
            <dd>{company.industry ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Employees</dt>
            <dd>{company.employeeCount?.toLocaleString() ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Temperature</dt>
            <dd>
              <TemperaturePill value={company.temperature} />
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
