"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type DragEvent } from "react";
import { TemperaturePill } from "@/components/pills";
import { money, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { moveDealStageAction } from "./actions";

export type KanbanDeal = {
  id: string;
  name: string;
  value: string | null;
  stageId: string;
  stageEnteredAt: Date;
  companyId: string;
  companyName: string;
  temperature: string | null;
};

export type KanbanStage = {
  id: string;
  name: string;
};

export function KanbanBoard({
  stages,
  initialDeals,
}: {
  stages: KanbanStage[];
  initialDeals: KanbanDeal[];
}) {
  const router = useRouter();
  const [deals, setDeals] = useState(initialDeals);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverStageId, setHoverStageId] = useState<string | null>(null);

  const byStage = new Map<string, KanbanDeal[]>();
  for (const s of stages) byStage.set(s.id, []);
  for (const d of deals) byStage.get(d.stageId)?.push(d);

  function onDragStart(e: DragEvent<HTMLAnchorElement>, dealId: string) {
    e.dataTransfer.setData("text/plain", dealId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(dealId);
  }

  function onDragEnd() {
    setDraggingId(null);
    setHoverStageId(null);
  }

  async function onDrop(e: DragEvent<HTMLDivElement>, stageId: string) {
    e.preventDefault();
    setHoverStageId(null);
    const dealId = e.dataTransfer.getData("text/plain") || draggingId;
    setDraggingId(null);
    if (!dealId) return;
    const current = deals.find((d) => d.id === dealId);
    if (!current || current.stageId === stageId) return;

    const previous = deals;
    setDeals(deals.map((d) => (d.id === dealId ? { ...d, stageId, stageEnteredAt: new Date() } : d)));
    const result = await moveDealStageAction({ dealId, stageId });
    if ("error" in result) {
      setDeals(previous);
      console.error("move_deal_stage failed:", result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const list = byStage.get(stage.id) ?? [];
        const total = list.reduce((sum, d) => sum + Number(d.value ?? 0), 0);
        const isHover = hoverStageId === stage.id;
        return (
          <div
            key={stage.id}
            className="w-72 shrink-0"
            onDragOver={(e) => {
              e.preventDefault();
              setHoverStageId(stage.id);
            }}
            onDragLeave={() => setHoverStageId((cur) => (cur === stage.id ? null : cur))}
            onDrop={(e) => onDrop(e, stage.id)}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-medium">{stage.name}</span>
              <span className="text-xs text-muted-foreground">
                {list.length} · {money(total)}
              </span>
            </div>
            <div
              className={cn(
                "min-h-[40px] space-y-2 rounded-md border border-dashed p-1 transition",
                isHover ? "border-primary/60 bg-primary/5" : "border-transparent",
              )}
            >
              {list.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
                  Drop a deal here
                </div>
              ) : (
                list.map((d) => (
                  <Link
                    key={d.id}
                    href={`/companies/${d.companyId}`}
                    draggable
                    onDragStart={(e) => onDragStart(e, d.id)}
                    onDragEnd={onDragEnd}
                    className={cn(
                      "block cursor-grab rounded-md border border-border bg-card/40 p-3 transition hover:bg-card/70 active:cursor-grabbing",
                      draggingId === d.id ? "opacity-40" : "",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{d.companyName}</span>
                      <TemperaturePill value={d.temperature} />
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{d.name}</div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="tabular-nums">{money(d.value)}</span>
                      <span className="text-muted-foreground">
                        {relativeTime(d.stageEnteredAt)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
