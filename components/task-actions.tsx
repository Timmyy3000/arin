"use client";

import { Check, X } from "lucide-react";
import { setTaskStatusAction } from "@/app/(app)/tasks/actions";
import { Button } from "@/components/ui/button";

export function TaskActions({ taskId }: { taskId: string }) {
  return (
    <div className="flex items-center gap-1">
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
    </div>
  );
}
