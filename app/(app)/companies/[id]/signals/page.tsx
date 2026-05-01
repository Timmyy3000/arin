import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { signals } from "@/db/schema/signals";
import { relativeTime } from "@/lib/format";

export default async function SignalsTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db()
    .select()
    .from(signals)
    .where(eq(signals.companyId, id))
    .orderBy(desc(signals.occurredAt));

  if (rows.length === 0) {
    return (
      <div className="px-6 py-5 text-[13px] text-text-muted">
        No signals logged yet.
      </div>
    );
  }

  return (
    <ol className="px-6 py-5">
      {rows.map((s) => (
        <li key={s.id} className="flex gap-3.5 border-b border-border-subtle py-3.5">
          <div
            className="mt-1 h-3 w-[3px] shrink-0 rounded"
            style={{ background: "oklch(0.65 0.12 250)" }}
          />
          <div className="flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <h4 className="text-[13px] font-medium text-text">{s.title}</h4>
              <span className="shrink-0 text-[11px] text-text-subtle">
                {relativeTime(s.occurredAt)}
              </span>
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-text-subtle">
              {s.type.replace(/_/g, " ")}
            </div>
            {s.description ? (
              <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">
                {s.description}
              </p>
            ) : null}
            {s.sourceUrl ? (
              <a
                href={s.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-block text-[11px] text-text-subtle hover:underline"
              >
                {s.sourceUrl}
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
