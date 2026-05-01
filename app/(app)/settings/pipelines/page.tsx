import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { pipelines, stages } from "@/db/schema/deals";
import { requireOrgSession } from "@/lib/session";

export default async function PipelinesSettingsPage() {
  const session = await requireOrgSession();
  const ps = await db()
    .select()
    .from(pipelines)
    .where(eq(pipelines.organizationId, session.organizationId));

  const stagesByPipeline = new Map<string, Awaited<ReturnType<typeof db>>["select"] extends never ? never : { id: string; name: string; order: number; isWon: boolean; isLost: boolean }[]>();
  for (const p of ps) {
    const sgs = await db()
      .select()
      .from(stages)
      .where(eq(stages.pipelineId, p.id))
      .orderBy(asc(stages.order));
    stagesByPipeline.set(p.id, sgs);
  }

  return (
    <div className="space-y-6">
      {ps.map((p) => (
        <section key={p.id}>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-base font-medium">{p.name}</h2>
            {p.isDefault ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary ring-1 ring-inset ring-primary/30">
                default
              </span>
            ) : null}
          </div>
          <ol className="space-y-1 text-sm">
            {(stagesByPipeline.get(p.id) ?? []).map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2"
              >
                <span>{s.name}</span>
                <span className="text-xs text-muted-foreground">
                  {s.isWon ? "won" : s.isLost ? "lost" : `position ${s.order + 1}`}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
      <p className="text-xs text-muted-foreground">
        Drag-to-reorder, add/remove stages, and rename land in Phase 3.
      </p>
    </div>
  );
}
