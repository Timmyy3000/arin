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
    return <p className="text-sm text-muted-foreground">No research yet. Ask Claude to research this account.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((r) => (
        <article
          key={r.id}
          className="rounded-md border border-border bg-card/40 p-5"
        >
          <h3 className="text-sm font-semibold capitalize">{label(r.section)}</h3>
          <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {r.body}
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            updated {relativeTime(r.updatedAt)}
          </div>
        </article>
      ))}
    </div>
  );
}
