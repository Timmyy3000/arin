"use client";

import { useEffect, useState, useTransition } from "react";
import { deleteStageAction, previewStageFlagToggleAction } from "./actions";
import type { StageEditorRow } from "./stages-editor";

export function DeleteStageDialog({
  stage,
  siblings,
  onClose,
  onError,
}: {
  stage: StageEditorRow;
  siblings: StageEditorRow[];
  onClose: () => void;
  onError: (msg: string) => void;
}) {
  const others = siblings.filter((s) => s.id !== stage.id);
  const [destinationId, setDestinationId] = useState(others[0]?.id ?? "");
  const [dealCount, setDealCount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void previewStageFlagToggleAction({ stageId: stage.id }).then((res) => {
      if (cancelled) return;
      if (res.ok) setDealCount(res.data.affectedDealCount);
    });
    return () => {
      cancelled = true;
    };
  }, [stage.id]);

  function onConfirm() {
    if (!destinationId) return;
    startTransition(async () => {
      const result = await deleteStageAction({ stageId: stage.id, destinationStageId: destinationId });
      if (!result.ok) {
        onError(result.message);
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-stage-title"
        className="w-[420px] rounded-lg border border-border bg-surface p-5 shadow-2xl"
      >
        <h3 id="delete-stage-title" className="mb-2 text-[14px] font-medium text-text">
          Delete &ldquo;{stage.name}&rdquo;
        </h3>
        <p className="mb-4 text-[12px] text-text-subtle">
          {dealCount === null
            ? "Counting deals on this stage…"
            : dealCount === 0
              ? "No deals are on this stage. Pick where future deals would land if they were."
              : `${dealCount} deal${dealCount === 1 ? "" : "s"} will be moved to the chosen stage before this one is deleted.`}
        </p>
        <label className="mb-4 block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
            Move deals to
          </span>
          <select
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[13px] text-text outline-none focus:border-accent"
          >
            {others.length === 0 ? (
              <option value="">No other stages — cannot delete</option>
            ) : (
              others.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            )}
          </select>
        </label>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md px-2 py-1 text-[12px] text-text-subtle hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || !destinationId}
            className="rounded-md bg-red-900/60 px-2.5 py-1 text-[12px] text-red-100 hover:bg-red-900/80 disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
