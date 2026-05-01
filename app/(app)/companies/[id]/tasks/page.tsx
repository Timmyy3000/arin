import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tasks } from "@/db/schema/tasks";
import { TaskRow, type TaskRowData } from "@/components/task-row";

export default async function TasksTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = (await db()
    .select({
      id: tasks.id,
      title: tasks.title,
      reasoning: tasks.reasoning,
      priority: tasks.priority,
      type: tasks.type,
      status: tasks.status,
      dueDate: tasks.dueDate,
      companyId: tasks.companyId,
      companyName: tasks.companyId,
    })
    .from(tasks)
    .where(eq(tasks.companyId, id))
    .orderBy(desc(tasks.createdAt))) as unknown as TaskRowData[];

  if (rows.length === 0) {
    return (
      <div className="px-6 py-5 text-[13px] text-text-muted">
        No tasks on this account.
      </div>
    );
  }

  return (
    <div className="px-6 py-3">
      {rows.map((t) => (
        <TaskRow key={t.id} task={{ ...t, companyName: null }} />
      ))}
    </div>
  );
}
