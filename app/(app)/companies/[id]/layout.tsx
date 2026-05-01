import Link from "next/link";
import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { companies } from "@/db/schema/companies";
import { CompanyLogo } from "@/components/avatar-init";
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

  const rows = await db().select().from(companies).where(eq(companies.id, id)).limit(1);
  const company = rows[0];
  if (!company || company.organizationId !== session.organizationId) notFound();

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="shrink-0 border-b border-border px-6 pt-3.5">
        <div className="mb-2.5 flex items-center gap-2 text-[12px] text-text-muted">
          <Link
            href="/companies"
            className="flex items-center gap-1 hover:text-text"
          >
            <ChevronLeft className="h-3 w-3" />
            Companies
          </Link>
          <span className="text-text-subtle">/</span>
          <span className="text-text">{company.name}</span>
        </div>
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <CompanyLogo name={company.name} size={36} />
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="text-[20px] font-semibold tracking-tight text-text"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {company.name}
                </h1>
                <TemperaturePill value={company.temperature} />
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-[11px] text-text-muted">
                {company.domain ? <span>{company.domain}</span> : null}
                {company.industry ? (
                  <>
                    <span>·</span>
                    <span>{company.industry}</span>
                  </>
                ) : null}
                {company.employeeCount ? (
                  <>
                    <span>·</span>
                    <span>{company.employeeCount.toLocaleString()} employees</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <CompanyTabs companyId={company.id} />
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
