import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { pipelines } from "@/db/schema/deals";
import { Badge } from "@/components/pills";
import { getStages } from "@/lib/data";
import { requireOrgSession } from "@/lib/session";

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
      return {
        id: p.id,
        name: p.name,
        isDefault: p.isDefault,
        stages: sgs.map((s) => ({
          id: s.id,
          name: s.name,
          isWon: s.isWon,
          isLost: s.isLost,
        })),
      };
    }),
  );

  return (
    <div className="max-w-[480px] space-y-6">
      <h2
        className="text-base font-semibold tracking-tight text-text"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Pipelines
      </h2>
      {out.map((p) => (
        <section
          key={p.id}
          className="rounded-lg border border-border bg-surface p-4"
        >
          <div className="mb-3.5 flex items-center justify-between">
            <span className="text-[13px] font-medium text-text">{p.name}</span>
            {p.isDefault ? <Badge>Default</Badge> : null}
          </div>
          <ul className="space-y-0">
            {p.stages.map((s, i) => (
              <li
                key={s.id}
                className={`flex items-center gap-2.5 py-1.5 ${
                  i < p.stages.length - 1 ? "border-b border-border-subtle" : ""
                }`}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-text-subtle"
                >
                  <path
                    d="M3 5h10M3 8h10M3 11h10"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="flex-1 text-[13px] text-text">{s.name}</span>
                {s.isWon ? (
                  <Badge
                    color="oklch(0.65 0.14 155)"
                    background="oklch(0.20 0.06 155 / 0.6)"
                  >
                    is_won
                  </Badge>
                ) : null}
                {s.isLost ? (
                  <Badge
                    color="oklch(0.55 0.10 25)"
                    background="oklch(0.19 0.04 25 / 0.6)"
                  >
                    is_lost
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-[11px] text-text-subtle">
        Reorder, add, and rename stages lands in Phase 4.
      </p>
    </div>
  );
}
