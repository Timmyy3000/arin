"use client";

import { Check, Trash2, X } from "lucide-react";
import { useState } from "react";
import { deleteTaskAction, setTaskStatusAction } from "@/app/(app)/tasks/actions";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Button } from "@/components/ui/button";

export function TaskActions({
  taskId,
  showStatusActions = true,
}: {
  taskId: string;
  showStatusActions?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <div className="flex items-center gap-1">
      {showStatusActions ? (
        <>
          <form action={setTaskStatusAction}>
            <input type="hidden" name="id" value={taskId} />
            <input type="hidden" name="status" value="done" />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              title="Mark done"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          </form>
          <form action={setTaskStatusAction}>
            <input type="hidden" name="id" value={taskId} />
            <input type="hidden" name="status" value="dismissed" />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </form>
        </>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
        title="Delete task"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <DeleteConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete task?"
        description="This task will be permanently deleted. This cannot be undone."
        onConfirm={() => deleteTaskAction({ taskId })}
      />
    </div>
  );
}
