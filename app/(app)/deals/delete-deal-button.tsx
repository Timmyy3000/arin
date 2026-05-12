"use client";

import { Trash2 } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { deleteDealAction } from "./actions";

export function DeleteDealButton({
  dealId,
  dealName,
  className,
  onDeleted,
}: {
  dealId: string;
  dealName: string;
  className?: string;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);

  function onClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  }

  async function onConfirm() {
    const result = await deleteDealAction({ dealId });
    if (result.ok) onDeleted?.();
    return result;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Delete deal"
        onClick={onClick}
        className={
          className ??
          "rounded p-1 text-text-subtle opacity-0 transition group-hover:opacity-100 hover:bg-surface-hover hover:text-destructive"
        }
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete deal?"
        description={
          <>
            &ldquo;{dealName}&rdquo; will be permanently deleted. Notes and tasks attached to
            this deal will also be removed. This cannot be undone.
          </>
        }
        onConfirm={onConfirm}
      />
    </>
  );
}
