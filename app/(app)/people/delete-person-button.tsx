"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { deletePersonAction, previewPersonDeleteAction } from "./actions";

type Counts = { tasks: number; notes: number; meetingAttendances: number };

export function DeletePersonButton({
  personId,
  personName,
  variant = "row",
  redirectTo,
}: {
  personId: string;
  personName: string;
  variant?: "row" | "header";
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void previewPersonDeleteAction({ personId }).then((res) => {
      if (cancelled) return;
      if (res.ok) setCounts(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, personId]);

  function stop(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function onConfirm() {
    const result = await deletePersonAction({ personId });
    if (result.ok && redirectTo) router.push(redirectTo);
    return result;
  }

  const description = counts
    ? buildDescription(personName, counts)
    : `Counting related items for ${personName}…`;

  if (variant === "header") {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
        <DeleteConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title={`Delete ${personName}?`}
          description={description}
          onConfirm={onConfirm}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Delete person"
        onClick={(e) => {
          stop(e);
          setOpen(true);
        }}
        className="rounded p-1 text-text-subtle opacity-0 transition group-hover:opacity-100 hover:bg-surface-hover hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${personName}?`}
        description={description}
        onConfirm={onConfirm}
      />
    </>
  );
}

function buildDescription(name: string, c: Counts): string {
  const parts: string[] = [];
  if (c.tasks) parts.push(`${c.tasks} task${c.tasks === 1 ? "" : "s"}`);
  if (c.notes) parts.push(`${c.notes} note${c.notes === 1 ? "" : "s"}`);
  if (c.meetingAttendances)
    parts.push(
      `${c.meetingAttendances} meeting attendance${
        c.meetingAttendances === 1 ? "" : "s"
      }`,
    );
  if (parts.length === 0) {
    return `${name} will be permanently deleted. Signals attributed to them will remain but lose the person link.`;
  }
  return `${name} will be permanently deleted along with ${parts.join(", ")}. Signals attributed to them will remain but lose the person link.`;
}
