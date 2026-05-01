import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organization } from "@/db/schema/auth";
import { requireOrgSession } from "@/lib/session";
import { Sidebar } from "@/components/nav/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOrgSession();
  const orgRows = await db()
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, session.organizationId))
    .limit(1);
  const orgName = orgRows[0]?.name ?? "Workspace";

  return (
    <div className="flex h-screen">
      <Sidebar
        orgName={orgName}
        userName={session.user.name ?? session.user.email}
        userEmail={session.user.email}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
