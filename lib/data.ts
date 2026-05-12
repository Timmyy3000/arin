import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { organization } from "@/db/schema/auth";
import { companies } from "@/db/schema/companies";
import { pipelines, stages } from "@/db/schema/deals";

export const orgTag = (organizationId: string) => `org:${organizationId}`;
export const pipelineTag = (organizationId: string) => `org:${organizationId}:pipelines`;
export const stagesTag = (pipelineId: string) => `pipeline:${pipelineId}:stages`;

export const getOrgName = cache(async (organizationId: string): Promise<string> => {
  return unstable_cache(
    async () => {
      const rows = await db()
        .select({ name: organization.name })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);
      return rows[0]?.name ?? "Workspace";
    },
    ["org-name", organizationId],
    { tags: [orgTag(organizationId)] },
  )();
});

export const getCompanyById = cache(
  async (id: string, organizationId: string) => {
    const rows = await db()
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), eq(companies.organizationId, organizationId)))
      .limit(1);
    return rows[0] ?? null;
  },
);

export const getDefaultPipeline = cache(async (organizationId: string) => {
  return unstable_cache(
    async () => {
      const rows = await db()
        .select()
        .from(pipelines)
        .where(
          and(
            eq(pipelines.organizationId, organizationId),
            eq(pipelines.isDefault, true),
          ),
        )
        .limit(1);
      return rows[0] ?? null;
    },
    ["default-pipeline", organizationId],
    { tags: [pipelineTag(organizationId)] },
  )();
});

export const getStages = cache(async (pipelineId: string, organizationId: string) => {
  return unstable_cache(
    async () => {
      return db()
        .select({
          id: stages.id,
          pipelineId: stages.pipelineId,
          name: stages.name,
          order: stages.order,
          isWon: stages.isWon,
          isLost: stages.isLost,
          createdAt: stages.createdAt,
        })
        .from(stages)
        .innerJoin(pipelines, eq(pipelines.id, stages.pipelineId))
        .where(
          and(
            eq(stages.pipelineId, pipelineId),
            eq(pipelines.organizationId, organizationId),
          ),
        )
        .orderBy(asc(stages.order));
    },
    ["stages", pipelineId, organizationId],
    { tags: [stagesTag(pipelineId), pipelineTag(organizationId)] },
  )();
});
