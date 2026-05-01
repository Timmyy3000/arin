import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { member, user } from "@/db/schema/auth";
import { Avatar } from "@/components/avatar-init";
import { Badge } from "@/components/pills";
import { requireOrgSession } from "@/lib/session";

export default async function MembersSettingsPage() {
  const session = await requireOrgSession();
  const rows = await db()
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
    .where(eq(member.organizationId, session.organizationId));

  return (
    <div className="max-w-[560px] space-y-5">
      <div className="flex items-center justify-between">
        <h2
          className="text-base font-semibold tracking-tight text-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Members
        </h2>
        <button
          type="button"
          className="h-[30px] rounded-md bg-accent px-3 text-[12px] font-medium text-white opacity-60"
          disabled
        >
          Invite member
        </button>
      </div>
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
      <p className="text-[11px] text-text-subtle">
        Inviting and removing members lands in Phase 4.
      </p>
    </div>
  );
}
