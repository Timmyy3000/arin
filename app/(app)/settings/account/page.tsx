import { requireSession } from "@/lib/session";

export default async function AccountSettingsPage() {
  const session = await requireSession();
  return (
    <div className="space-y-4">
      <h2 className="text-base font-medium">Account</h2>
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between border-b border-border/40 py-2">
          <dt className="text-muted-foreground">Name</dt>
          <dd>{session.user.name}</dd>
        </div>
        <div className="flex items-center justify-between border-b border-border/40 py-2">
          <dt className="text-muted-foreground">Email</dt>
          <dd>{session.user.email}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        Editing profile and changing password land in Phase 3.
      </p>
    </div>
  );
}
