import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { member, user } from "@/db/schema/auth";
import { Avatar } from "@/components/avatar-init";
import { Badge } from "@/components/pills";
import { env } from "@/lib/env";
import { listActiveInviteLinks } from "@/lib/invite-links";
import { requireOrgSession } from "@/lib/session";
import { InviteControls, type ActiveInviteRow } from "./invite-controls";

export default async function MembersSettingsPage() {
  const session = await requireOrgSession();
  const [rows, callerRoleRows] = await Promise.all([
    db()
      .select({
        memberId: member.id,
        role: member.role,
        createdAt: member.createdAt,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.organizationId, session.organizationId)),
    db()
      .select({ role: member.role })
      .from(member)
      .where(
        and(
          eq(member.userId, session.user.id),
          eq(member.organizationId, session.organizationId),
        ),
      )
      .limit(1),
  ]);
  const callerRole = callerRoleRows[0]?.role ?? null;
  const canManage = callerRole === "owner" || callerRole === "admin";
  const active: ActiveInviteRow[] = canManage
    ? (await listActiveInviteLinks(db(), session.organizationId)).map((r) => ({
        token: r.token,
        url: `${env.APP_URL}/invite/${r.token}`,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
      }))
    : [];

  return (
    <div className="max-w-[560px] space-y-5">
      <h2
        className="text-base font-semibold tracking-tight text-text"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Members
      </h2>
      <InviteControls appUrl={env.APP_URL} active={active} canManage={canManage} />
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-[12px]">
          <thead className="border-b border-border bg-surface">
            <tr>
              {["Member", "Email", "Role", ""].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-subtle"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr
                key={m.memberId}
                className={i > 0 ? "border-t border-border-subtle" : ""}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar name={m.userName} size={24} />
                    <span className="font-medium text-text">{m.userName}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-text-muted">{m.userEmail}</td>
                <td className="px-3 py-2.5">
                  <Badge>{m.role}</Badge>
                </td>
                <td className="px-3 py-2.5 text-right text-[11px] text-text-subtle">
                  {m.userId === session.user.id ? "You" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
