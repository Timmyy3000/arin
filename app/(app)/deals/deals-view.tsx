"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CompanyLogo } from "@/components/avatar-init";
import { StagePill, TemperaturePill } from "@/components/pills";
import { money, relativeTime } from "@/lib/format";
import { KanbanBoard, type KanbanDeal, type KanbanStage } from "./kanban";

type DealRow = KanbanDeal;

const FORECAST: Record<string, string> = {
  Lead: "Pipeline",
  Qualified: "Pipeline",
  Discovery: "Pipeline",
  Evaluation: "Pipeline",
  Proposal: "Best Case",
  Negotiation: "Commit",
  Won: "Closed Won",
  Lost: "Lost",
};

function healthScore(daysInStage: number, temperature: string | null): number {
  let score = 10;
  score += Math.min(daysInStage, 60) / 2;
  if (temperature === "cold") score += 18;
  if (temperature === "warm") score += 8;
  if (temperature === "hot") score -= 4;
  if (temperature === "on_fire") score -= 8;
  return Math.max(0, Math.min(50, Math.round(score)));
}

function healthColor(score: number): string {
  if (score < 15) return "oklch(0.65 0.14 155)";
  if (score < 35) return "oklch(0.72 0.14 65)";
  return "oklch(0.62 0.18 25)";
}

export function DealsView({
  pipelineName,
  view,
  stages,
  deals,
}: {
  pipelineName: string;
  view: "list" | "board";
  stages: (KanbanStage & { isWon: boolean; isLost: boolean })[];
  deals: DealRow[];
}) {
  const [filter, setFilter] = useState<"all" | "at_risk" | "watch">("all");
  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);

  const enriched = useMemo(
    () =>
      deals.map((d) => {
        const days = Math.max(
          0,
          Math.round((Date.now() - d.stageEnteredAt.getTime()) / 86_400_000),
        );
        const stage = stageById.get(d.stageId);
        return {
          ...d,
          stageName: stage?.name ?? "Unknown",
          isWon: stage?.isWon ?? false,
          isLost: stage?.isLost ?? false,
          daysInStage: days,
          score: healthScore(days, d.temperature),
        };
      }),
    [deals, stageById],
  );

  const filtered = useMemo(() => {
    if (filter === "at_risk")
      return enriched.filter((d) => d.daysInStage > 20 || d.temperature === "cold");
    if (filter === "watch") return enriched.filter((d) => d.temperature === "warm");
    return enriched;
  }, [enriched, filter]);

  const totalValue = enriched.reduce((s, d) => s + Number(d.value ?? 0), 0);
  const atRiskValue = enriched
    .filter((d) => d.daysInStage > 20 || d.temperature === "cold")
    .reduce((s, d) => s + Number(d.value ?? 0), 0);
  const atRiskCount = enriched.filter((d) => d.daysInStage > 20 || d.temperature === "cold")
    .length;

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="shrink-0 border-b border-border px-6 pt-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1
              className="text-base font-semibold tracking-tight text-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Deals
            </h1>
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-text-subtle">Total Pipeline</span>
              <span className="font-mono text-[14px] font-semibold text-text">
                {enriched.length} · {money(totalValue)}
              </span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[11px]" style={{ color: "oklch(0.62 0.18 25)" }}>
                Pipeline at Risk
              </span>
              <span
                className="font-mono text-[14px] font-semibold"
                style={{ color: "oklch(0.62 0.18 25)" }}
              >
                {atRiskCount} · {money(atRiskValue)}
              </span>
            </div>
          </div>
          <div className="flex gap-1.5">
            {(
              [
                ["all", "All"],
                ["at_risk", "At Risk"],
                ["watch", "Watch"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setFilter(v)}
                className={
                  filter === v
                    ? "rounded-md border border-accent bg-accent-subtle px-2.5 py-1 text-[12px] text-accent"
                    : "rounded-md border border-border bg-surface-hover px-2.5 py-1 text-[12px] text-text-muted hover:text-text"
                }
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="-mb-px flex gap-0">
          {(
            [
              ["list", "List"],
              ["board", "Board"],
            ] as const
          ).map(([v, l]) => (
            <Link
              key={v}
              href={`/deals?view=${v}`}
              className={
                view === v
                  ? "border-b-2 border-accent px-3.5 py-2 text-[13px] font-medium text-text"
                  : "border-b-2 border-transparent px-3.5 py-2 text-[13px] text-text-muted hover:text-text"
              }
            >
              {l}
            </Link>
          ))}
          <span className="px-3.5 py-2 text-[12px] text-text-subtle">{pipelineName}</span>
        </div>
      </div>

      {view === "list" ? (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface">
              <tr>
                <th className="w-[60px] px-3.5 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                  Health
                </th>
                <th className="px-3.5 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                  Deal
                </th>
                <th className="px-3.5 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                  Value
                </th>
                <th className="px-3.5 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                  Stage
                </th>
                <th className="px-3.5 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                  Forecast
                </th>
                <th className="px-3.5 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                  Temp
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  className="cursor-pointer border-b border-border-subtle transition hover:bg-surface-hover"
                >
                  <td className="px-3.5 py-2.5 align-middle">
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-active font-mono text-[11px] font-bold"
                      style={{ color: healthColor(d.score) }}
                    >
                      {d.score}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 align-middle">
                    <Link
                      href={`/companies/${d.companyId}`}
                      className="flex items-center gap-2"
                    >
                      <CompanyLogo name={d.companyName} size={20} />
                      <div>
                        <div className="text-[13px] font-medium text-text">
                          {d.companyName} — {d.name}
                        </div>
                        <div className="text-[11px] text-text-subtle">
                          {d.daysInStage}d in stage
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3.5 py-2.5 align-middle font-mono text-[12px] text-text">
                    {money(d.value)}
                  </td>
                  <td className="px-3.5 py-2.5 align-middle">
                    <StagePill value={d.stageName} />
                  </td>
                  <td className="px-3.5 py-2.5 align-middle text-[12px] text-text-muted">
                    {FORECAST[d.stageName] ?? "Pipeline"}
                  </td>
                  <td className="px-3.5 py-2.5 align-middle">
                    <TemperaturePill value={d.temperature} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3.5 py-10 text-center text-[13px] text-text-muted"
                  >
                    No deals match this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <p className="px-6 py-2 text-[11px] text-text-subtle">
            Tip: switch to <span className="font-medium">Board</span> view above to drag deals
            between stages.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden p-4">
          <KanbanBoard
            stages={stages.map((s) => ({ id: s.id, name: s.name }))}
            initialDeals={deals}
          />
        </div>
      )}
    </div>
  );
}

void relativeTime;
