"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { StagePill } from "@/components/pills";
import {
  STAGE_COLORS,
  STAGE_COLOR_TOKENS,
  type StageColor,
} from "@/lib/stage-colors";
import { previewStageFlagToggleAction, reorderStageAction, updateStageAction } from "./actions";
import { DeleteStageDialog } from "./delete-stage-dialog";
import type { StageEditorRow } from "./stages-editor";

export function StageRow({
  stage,
  isFirst,
  isLast,
  siblings,
}: {
  stage: StageEditorRow;
  isFirst: boolean;
  isLast: boolean;
  siblings: StageEditorRow[];
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stage.name);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  function startEdit() {
    setName(stage.name);
    setEditing(true);
  }
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function commitName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === stage.name) {
      setName(stage.name);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", stage.id);
      fd.set("name", trimmed);
      const result = await updateStageAction(fd);
      if (!result.ok) {
        setError(result.message);
        setName(stage.name);
      }
      setEditing(false);
    });
  }

  function pickColor(next: StageColor | null) {
    setColorPickerOpen(false);
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", stage.id);
      fd.set("color", next ?? "");
      const result = await updateStageAction(fd);
      if (!result.ok) setError(result.message);
    });
  }

  function setFlag(flag: "isWon" | "isLost", value: boolean) {
    setError(null);
    startTransition(async () => {
      if (value) {
        const preview = await previewStageFlagToggleAction({ stageId: stage.id });
        if (preview.ok && preview.data.affectedDealCount > 0) {
          const proceed = window.confirm(
            `${preview.data.affectedDealCount} deal${
              preview.data.affectedDealCount === 1 ? "" : "s"
            } currently in this stage will be re-classified. Continue?`,
          );
          if (!proceed) return;
        }
      }
      const fd = new FormData();
      fd.set("id", stage.id);
      fd.set(flag, value ? "true" : "false");
      // Sending the other flag explicitly off when turning one on prevents the DB CHECK
      // from rejecting a transient both-true state.
      if (value) {
        const other = flag === "isWon" ? "isLost" : "isWon";
        if ((other === "isWon" && stage.isWon) || (other === "isLost" && stage.isLost)) {
          fd.set(other, "false");
        }
      }
      const result = await updateStageAction(fd);
      if (!result.ok) setError(result.message);
    });
  }

  function reorder(direction: "up" | "down") {
    setError(null);
    startTransition(async () => {
      const result = await reorderStageAction({ stageId: stage.id, direction });
      if (!result.ok) setError(result.message);
    });
  }

  function onNameKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitName();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setName(stage.name);
      setEditing(false);
    }
  }

  return (
    <li className="group flex items-center gap-2 rounded-md border border-transparent px-1.5 py-1 hover:border-border-subtle">
      <div className="flex flex-col">
        <button
          type="button"
          aria-label="Move up"
          disabled={isFirst || pending}
          onClick={() => reorder("up")}
          className="text-text-subtle hover:text-text disabled:opacity-25"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={isLast || pending}
          onClick={() => reorder("down")}
          className="text-text-subtle hover:text-text disabled:opacity-25"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="Pick stage colour"
          onClick={() => setColorPickerOpen((v) => !v)}
          disabled={pending}
          className="h-4 w-4 rounded-full border border-border-subtle"
          style={{
            background: stage.color
              ? STAGE_COLOR_TOKENS[stage.color].text
              : "transparent",
          }}
        />
        {colorPickerOpen ? (
          <div className="absolute left-0 top-6 z-10 flex flex-wrap gap-1.5 rounded-md border border-border bg-surface p-2 shadow-lg">
            {STAGE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => pickColor(c)}
                className="h-5 w-5 rounded-full border border-border-subtle hover:scale-110"
                style={{ background: STAGE_COLOR_TOKENS[c].text }}
              />
            ))}
            <button
              type="button"
              onClick={() => pickColor(null)}
              className="h-5 rounded-md border border-border-subtle px-1.5 text-[10px] text-text-subtle hover:text-text"
            >
              clear
            </button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={onNameKey}
          className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-[13px] text-text outline-none focus:border-accent"
          disabled={pending}
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <StagePill value={stage.name} color={stage.color} />
        </button>
      )}

      <button
        type="button"
        onClick={() => setFlag("isWon", !stage.isWon)}
        disabled={pending}
        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
          stage.isWon
            ? "bg-emerald-900/40 text-emerald-300"
            : "bg-surface-active text-text-subtle hover:text-text"
        }`}
      >
        Won
      </button>
      <button
        type="button"
        onClick={() => setFlag("isLost", !stage.isLost)}
        disabled={pending}
        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
          stage.isLost
            ? "bg-red-900/40 text-red-300"
            : "bg-surface-active text-text-subtle hover:text-text"
        }`}
      >
        Lost
      </button>

      <button
        type="button"
        onClick={() => setDeleteOpen(true)}
        disabled={pending}
        aria-label="Delete stage"
        className="text-text-subtle opacity-0 group-hover:opacity-100 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {deleteOpen ? (
        <DeleteStageDialog
          stage={stage}
          siblings={siblings}
          onClose={() => setDeleteOpen(false)}
          onError={(msg) => setError(msg)}
        />
      ) : null}

      {error ? (
        <span className="ml-2 text-[11px] text-red-400" role="alert">
          {error}
        </span>
      ) : null}
    </li>
  );
}
