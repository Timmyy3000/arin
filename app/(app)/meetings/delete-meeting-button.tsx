"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { deleteMeetingAction } from "./actions";

export function DeleteMeetingButton({
  meetingId,
  meetingTitle,
}: {
  meetingId: string;
  meetingTitle: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Delete meeting"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="rounded p-1 text-text-subtle opacity-0 transition group-hover:opacity-100 hover:bg-surface-hover hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete meeting?"
        description={
          <>
            &ldquo;{meetingTitle}&rdquo; will be permanently deleted. This cannot be undone.
          </>
        }
        onConfirm={() => deleteMeetingAction({ meetingId })}
      />
    </>
  );
}
