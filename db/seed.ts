import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { createDb } from "./client";
import { member, organization, user } from "./schema/auth";
import { pipelines, stages } from "./schema/deals";

type Db = ReturnType<typeof createDb>;

const DEFAULT_STAGES = [
  { name: "Lead", order: 0, isWon: false, isLost: false },
  { name: "Qualified", order: 1, isWon: false, isLost: false },
  { name: "Discovery", order: 2, isWon: false, isLost: false },
  { name: "Proposal", order: 3, isWon: false, isLost: false },
  { name: "Negotiation", order: 4, isWon: false, isLost: false },
  { name: "Won", order: 5, isWon: true, isLost: false },
  { name: "Lost", order: 6, isWon: false, isLost: true },
];

export async function seedDefaultOrg(db: Db, name: string, slug: string): Promise<string> {
  const existing = await db.select().from(organization).where(eq(organization.slug, slug)).limit(1);
  if (existing[0]) return existing[0].id;

  const id = randomUUID();
  await db.insert(organization).values({ id, name, slug });
  return id;
}

export async function seedAdminUser(
  email: string,
  password: string,
  name = "Admin",
): Promise<string> {
  const result = await auth.api.signUpEmail({ body: { email, password, name } });
  if (!result?.user?.id) throw new Error("admin sign-up did not return a user");
  return result.user.id;
}

export async function ensureMembership(
  db: Db,
  userId: string,
  organizationId: string,
  role = "owner",
): Promise<void> {
  const existing = await db
    .select()
    .from(member)
    .where(eq(member.userId, userId))
    .limit(50);
  if (existing.some((m) => m.organizationId === organizationId)) return;

  await db.insert(member).values({
    id: randomUUID(),
    userId,
    organizationId,
    role,
  });
}

export async function seedDefaultPipeline(db: Db, organizationId: string): Promise<string> {
  const existing = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.organizationId, organizationId))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const pipelineId = randomUUID();
  await db.insert(pipelines).values({
    id: pipelineId,
    organizationId,
    name: "Sales",
    isDefault: true,
  });
  await db.insert(stages).values(
    DEFAULT_STAGES.map((s) => ({
      id: randomUUID(),
      pipelineId,
      name: s.name,
      order: s.order,
      isWon: s.isWon,
      isLost: s.isLost,
    })),
  );
  return pipelineId;
}

export async function seedAll(db: Db): Promise<{
  organizationId: string;
  adminUserId: string | null;
  pipelineId: string;
}> {
  const organizationId = await seedDefaultOrg(db, env.DEFAULT_ORG_NAME, env.DEFAULT_ORG_SLUG);

  let adminUserId: string | null = null;
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    const existing = await db
      .select()
      .from(user)
      .where(eq(user.email, env.ADMIN_EMAIL))
      .limit(1);
    adminUserId = existing[0]?.id ?? (await seedAdminUser(env.ADMIN_EMAIL, env.ADMIN_PASSWORD));
    await ensureMembership(db, adminUserId, organizationId, "owner");
  }

  const pipelineId = await seedDefaultPipeline(db, organizationId);
  return { organizationId, adminUserId, pipelineId };
}

if (import.meta.main) {
  const { db } = await import("./client");
  const result = await seedAll(db());
  console.log("seed complete:", result);
  process.exit(0);
}
