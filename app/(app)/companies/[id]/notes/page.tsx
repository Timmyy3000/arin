import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { notes } from "@/db/schema/notes";
import { Avatar } from "@/components/avatar-init";
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
    <div className="space-y-4 px-6 py-5">
      <NoteComposer companyId={id} />
      {rows.length === 0 ? (
        <p className="text-[13px] text-text-muted">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((n) => (
            <li
              key={n.id}
              className="rounded-lg border border-border bg-surface px-4 py-3"
            >
              <div className="flex items-center gap-2 text-[12px]">
                <Avatar name={n.author === "agent" ? "Claude" : "User"} size={22} />
                <span className="font-medium capitalize text-text">{n.author}</span>
                <span className="text-text-subtle">{relativeTime(n.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-text-muted">
                {n.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
