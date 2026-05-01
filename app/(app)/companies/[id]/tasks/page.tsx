import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tasks } from "@/db/schema/tasks";
import { PriorityIndicator } from "@/components/pills";
import { relativeTime } from "@/lib/format";

export default async function TasksTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db()
    .select()
    .from(tasks)
    .where(eq(tasks.companyId, id))
    .orderBy(desc(tasks.createdAt));

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No tasks on this account.</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((t) => (
        <li
          key={t.id}
          className="rounded-md border border-border px-4 py-3"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <PriorityIndicator value={t.priority} />
              <h4 className="text-sm font-medium">{t.title}</h4>
            </div>
            <div className="text-xs text-muted-foreground">
              {t.status === "done" ? "done" : relativeTime(t.dueDate)}
            </div>
          </div>
          {t.reasoning ? (
            <p className="mt-1 text-xs text-muted-foreground">{t.reasoning}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
