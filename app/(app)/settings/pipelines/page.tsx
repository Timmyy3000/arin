import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { pipelines } from "@/db/schema/deals";
import { Badge } from "@/components/pills";
import { getStages } from "@/lib/data";
import { requireOrgSession } from "@/lib/session";
import { isStageColor, type StageColor } from "@/lib/stage-colors";
import { StagesEditor, type StageEditorRow } from "./stages-editor";

export default async function PipelinesSettingsPage() {
  const session = await requireOrgSession();
  const orgId = session.organizationId;
  const ps = await db()
    .select()
    .from(pipelines)
    .where(eq(pipelines.organizationId, orgId));

  const out = await Promise.all(
    ps.map(async (p) => {
      const sgs = await getStages(p.id, orgId);
      const rows: StageEditorRow[] = sgs.map((s) => ({
        id: s.id,
        name: s.name,
        color: isStageColor(s.color) ? (s.color as StageColor) : null,
        isWon: s.isWon,
        isLost: s.isLost,
      }));
      return { id: p.id, name: p.name, isDefault: p.isDefault, rows };
    }),
  );

  return (
    <div className="max-w-[640px] space-y-6">
      <h2
        className="text-base font-semibold tracking-tight text-text"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Pipelines
      </h2>
      {out.map((p) => (
        <section key={p.id} className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3.5 flex items-center justify-between">
            <span className="text-[13px] font-medium text-text">{p.name}</span>
            {p.isDefault ? <Badge>Default</Badge> : null}
          </div>
          <StagesEditor pipelineId={p.id} initialStages={p.rows} />
        </section>
      ))}
    </div>
  );
}
