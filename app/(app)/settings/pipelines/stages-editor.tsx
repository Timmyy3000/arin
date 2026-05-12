"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";
import type { StageColor } from "@/lib/stage-colors";
import { addStageAction } from "./actions";
import { StageRow } from "./stage-row";

export type StageEditorRow = {
  id: string;
  name: string;
  color: StageColor | null;
  isWon: boolean;
  isLost: boolean;
};

export function StagesEditor({
  pipelineId,
  initialStages,
}: {
  pipelineId: string;
  initialStages: StageEditorRow[];
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = newName.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("pipelineId", pipelineId);
      fd.set("name", trimmed);
      const result = await addStageAction(fd);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNewName("");
      setAdding(false);
    });
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {initialStages.map((s, i) => (
          <StageRow
            key={s.id}
            stage={s}
            isFirst={i === 0}
            isLast={i === initialStages.length - 1}
            siblings={initialStages}
          />
        ))}
      </ul>

      {adding ? (
        <form onSubmit={onAdd} className="flex items-center gap-2 pt-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setNewName("");
                setAdding(false);
                setError(null);
              }
            }}
            placeholder="Stage name"
            className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-[13px] text-text outline-none focus:border-accent"
            disabled={pending}
          />
          <button
            type="submit"
            disabled={pending || !newName.trim()}
            className="rounded-md border border-border bg-surface-active px-2 py-1 text-[12px] text-text hover:bg-surface disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setNewName("");
              setAdding(false);
              setError(null);
            }}
            className="text-[12px] text-text-subtle hover:text-text"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 pt-2 text-[12px] text-text-subtle hover:text-text"
        >
          <Plus className="h-3.5 w-3.5" />
          Add stage
        </button>
      )}

      {error ? <p className="text-[12px] text-red-400">{error}</p> : null}
    </div>
  );
}
