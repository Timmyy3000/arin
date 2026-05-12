import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { member, organization } from "@/db/schema/auth";
import { resolveInviteLink } from "@/lib/invite-links";
import { getSession } from "@/lib/session";
import { acceptInviteAction, switchToOrgAction } from "./actions";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Params = Promise<{ token: string }>;
type SearchParams = Promise<{ status?: string }>;

export default async function AcceptInvitePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { token } = await params;
  const { status } = await searchParams;
  const resolved = await resolveInviteLink(db(), token);

  if (!resolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-[360px] text-center">
          <div
            className="mb-2 text-[20px] font-semibold tracking-tight text-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Invite link not valid
          </div>
          <p className="mb-5 text-[13px] leading-relaxed text-text-muted">
            {status === "failed"
              ? "Someone else may have just used this link, or it was revoked. Ask the admin for a fresh invite."
              : "This invite link has expired, been used, or been revoked. Ask the admin who sent it to generate a fresh one."}
          </p>
          <Link href="/sign-in" className="text-[13px] text-accent hover:underline">
            Back to sign in →
          </Link>
        </div>
      </div>
    );
  }

  const session = await getSession();
  if (!session) {
    redirect(`/sign-up?invite=${encodeURIComponent(token)}`);
  }

  const [orgRows, existingMembership] = await Promise.all([
    db()
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, resolved.organizationId))
      .limit(1),
    db()
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.userId, session.user.id),
          eq(member.organizationId, resolved.organizationId),
        ),
      )
      .limit(1),
  ]);
  const orgName = orgRows[0]?.name ?? "this workspace";
  const alreadyMember = existingMembership.length > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-[420px] rounded-xl border border-border bg-surface px-7 py-6">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
          {alreadyMember ? "Already a member" : "You've been invited"}
        </div>
        <h2
          className="mb-1.5 text-[22px] font-semibold tracking-tight text-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {alreadyMember ? `You're in ${orgName}` : `Join ${orgName}`}
        </h2>
        <p className="mb-5 text-[13px] leading-relaxed text-text-muted">
          Signed in as <span className="text-text">{session.user.email}</span>.{" "}
          {alreadyMember
            ? "Your account already has access to this workspace."
            : "Accepting will add your account to this workspace as a member."}
        </p>
        <form
          action={alreadyMember ? switchToOrgAction : acceptInviteAction}
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="token" value={token} />
          <input
            type="hidden"
            name="organization_id"
            value={resolved.organizationId}
          />
          <button
            type="submit"
            className="h-9 rounded-md bg-accent text-[13px] font-medium text-white transition"
          >
            {alreadyMember ? `Open ${orgName}` : `Accept and join ${orgName}`}
          </button>
          <Link
            href="/"
            className="h-9 rounded-md border border-border bg-surface-hover text-center text-[13px] leading-9 font-medium text-text transition"
          >
            Not now
          </Link>
        </form>
      </div>
    </div>
  );
}
