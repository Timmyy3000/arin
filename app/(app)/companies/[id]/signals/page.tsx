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
    return <p className="text-sm text-muted-foreground">No signals logged yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {rows.map((s) => (
        <li key={s.id} className="flex gap-3">
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/70" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-sm font-medium">{s.title}</h4>
              <span className="shrink-0 text-xs text-muted-foreground">
                {relativeTime(s.occurredAt)}
              </span>
            </div>
            <div className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
              {s.type.replace(/_/g, " ")}
            </div>
            {s.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
            ) : null}
            {s.sourceUrl ? (
              <a
                href={s.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs text-muted-foreground underline-offset-2 hover:underline"
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
