import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { notes } from "@/db/schema/notes";
import { relativeTime } from "@/lib/format";
import { NoteComposer } from "./note-composer";

export default async function NotesTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db()
    .select()
    .from(notes)
    .where(eq(notes.companyId, id))
    .orderBy(desc(notes.createdAt));

  return (
    <div className="space-y-6">
      <NoteComposer companyId={id} />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((n) => (
            <li
              key={n.id}
              className="rounded-md border border-border bg-card/40 px-4 py-3"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="capitalize">{n.author}</span>
                <span>{relativeTime(n.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
