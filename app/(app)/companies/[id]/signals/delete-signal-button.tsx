"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { deleteSignalAction } from "./actions";

export function DeleteSignalButton({
  signalId,
  signalTitle,
}: {
  signalId: string;
  signalTitle: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Delete signal"
        onClick={() => setOpen(true)}
        className="rounded p-1 text-text-subtle opacity-0 transition group-hover:opacity-100 hover:bg-surface-hover hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete signal?"
        description={
          <>
            &ldquo;{signalTitle}&rdquo; will be permanently deleted. This cannot be undone.
          </>
        }
        onConfirm={() => deleteSignalAction({ signalId })}
      />
    </>
  );
}
