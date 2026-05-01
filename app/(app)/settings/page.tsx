import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organization } from "@/db/schema/auth";
import { requireOrgSession } from "@/lib/session";

export default async function GeneralSettingsPage() {
  const session = await requireOrgSession();
  const orgRows = await db()
    .select()
    .from(organization)
    .where(eq(organization.id, session.organizationId))
    .limit(1);
  const org = orgRows[0]!;
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-base font-medium">Organization</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between border-b border-border/40 py-2">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{org.name}</dd>
          </div>
          <div className="flex items-center justify-between border-b border-border/40 py-2">
            <dt className="text-muted-foreground">Slug</dt>
            <dd className="font-mono text-xs">{org.slug}</dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-muted-foreground">Created</dt>
            <dd>{org.createdAt.toLocaleDateString()}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Editing organization details lands in Phase 3.
        </p>
      </section>
    </div>
  );
}
