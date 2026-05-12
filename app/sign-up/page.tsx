import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organization } from "@/db/schema/auth";
import { resolveInviteLink } from "@/lib/invite-links";
import { getSession } from "@/lib/session";
import { SignUpForm } from "./sign-up-form";

type SearchParams = Promise<{ invite?: string }>;

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  const { invite } = await searchParams;

  if (session) {
    redirect(invite ? `/invite/${invite}` : "/");
  }

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-[340px] text-center">
          <div
            className="mb-2 text-[20px] font-semibold tracking-tight text-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Invite required
          </div>
          <p className="mb-5 text-[13px] leading-relaxed text-text-muted">
            Arin sign-up is invite-only. Ask a workspace admin for an invite link.
          </p>
          <Link
            href="/sign-in"
            className="text-[13px] text-accent hover:underline"
          >
            Already have an account? Sign in →
          </Link>
        </div>
      </div>
    );
  }

  const resolved = await resolveInviteLink(db(), invite);
  if (!resolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-[340px] text-center">
          <div
            className="mb-2 text-[20px] font-semibold tracking-tight text-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Invite link not valid
          </div>
          <p className="mb-5 text-[13px] leading-relaxed text-text-muted">
            This invite link has expired, been used, or been revoked. Ask the admin who
            sent it to generate a fresh one.
          </p>
          <Link href="/sign-in" className="text-[13px] text-accent hover:underline">
            Already have an account? Sign in →
          </Link>
        </div>
      </div>
    );
  }

  const orgRows = await db()
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, resolved.organizationId))
    .limit(1);
  const orgName = orgRows[0]?.name ?? "Arin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-[340px]">
        <div className="mb-8 text-center">
          <span
            className="mb-3.5 inline-flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "oklch(0.35 0.14 250)" }}
          >
            <span
              className="font-mono text-base font-bold"
              style={{ color: "oklch(0.85 0.12 250)" }}
            >
              A
            </span>
          </span>
          <div
            className="text-2xl font-semibold tracking-tight text-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Join {orgName}
          </div>
          <p className="mt-1.5 text-[12px] text-text-muted">
            You&apos;ve been invited to a workspace on Arin.
          </p>
        </div>
        <SignUpForm inviteToken={invite} />
        <p className="mt-4 text-center text-[12px] text-text-subtle">
          Already have an account?{" "}
          <Link
            href={`/sign-in?invite=${encodeURIComponent(invite)}`}
            className="text-accent hover:underline"
          >
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  );
}
