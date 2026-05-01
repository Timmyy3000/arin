import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { member, user } from "@/db/schema/auth";
import { requireOrgSession } from "@/lib/session";

export default async function MembersSettingsPage() {
  const session = await requireOrgSession();
  const rows = await db()
    .select({
      memberId: member.id,
      role: member.role,
      createdAt: member.createdAt,
      userName: user.name,
      userEmail: user.email,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, session.organizationId));

  return (
    <div className="space-y-4">
      <h2 className="text-base font-medium">Members</h2>
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Person</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={m.memberId} className={i > 0 ? "border-t border-border/60" : ""}>
                <td className="px-4 py-3">
                  <div className="font-medium">{m.userName}</div>
                  <div className="text-xs text-muted-foreground">{m.userEmail}</div>
                </td>
                <td className="px-4 py-3 capitalize">{m.role}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {m.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Inviting and removing members lands in Phase 3.
      </p>
    </div>
  );
}
