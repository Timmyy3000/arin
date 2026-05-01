import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { research } from "@/db/schema/signals";
import { relativeTime } from "@/lib/format";

const SECTION_LABELS: Record<string, string> = {
  why_we_win: "Why We Win",
  icp_fit: "ICP Fit",
  competitive_positioning: "Competitive Positioning",
  tech_stack: "Tech Stack & Gaps",
  recent_news: "Recent News & Triggers",
  case_studies: "Relevant Case Studies",
  org_changes: "Executive & Org Changes",
  industry_context: "Industry & Business Context",
  overview: "Overview",
};

function label(section: string) {
  return SECTION_LABELS[section] ?? section.replace(/_/g, " ");
}

export default async function ResearchTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db()
    .select()
    .from(research)
    .where(eq(research.companyId, id))
    .orderBy(desc(research.updatedAt));

  if (rows.length === 0) {
    return (
      <div className="px-6 py-5 text-[13px] text-text-muted">
        No research yet. Ask Claude to research this account.
      </div>
    );
  }

  return (
    <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
      {rows.map((r) => (
        <article
          key={r.id}
          className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-4"
        >
          <h3 className="text-[12px] font-semibold capitalize text-text">{label(r.section)}</h3>
          <div className="whitespace-pre-wrap text-[12.5px] leading-[1.7] text-text-muted">
            {r.body}
          </div>
          <div className="text-[10px] text-text-subtle">
            updated {relativeTime(r.updatedAt)}
          </div>
        </article>
      ))}
    </div>
  );
}
