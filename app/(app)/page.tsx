import { requireOrgSession } from "@/lib/session";

export default async function CockpitPlaceholder() {
  const session = await requireOrgSession();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Cockpit</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Welcome back, {session.user.name ?? session.user.email}.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        org: <code>{session.organizationId}</code>
      </p>
    </div>
  );
}
