import { getOrgName } from "@/lib/data";
import { requireOrgSession } from "@/lib/session";
import { Sidebar } from "@/components/nav/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOrgSession();
  const orgName = await getOrgName(session.organizationId);

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
