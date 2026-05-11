import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { member, oauthClient, organization } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { approveConsent, denyConsent } from "./actions";

type SearchParams = Promise<{
  client_id?: string;
  scope?: string;
  code?: string;
}>;

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { client_id, scope, code } = await searchParams;
  if (!client_id || !code) redirect("/sign-in");

  const session = await requireSession();

  const [client] = await db()
    .select({ name: oauthClient.name, uri: oauthClient.uri })
    .from(oauthClient)
    .where(eq(oauthClient.clientId, client_id))
    .limit(1);

  const memberships = await db()
    .select({
      organizationId: member.organizationId,
      organizationName: organization.name,
      organizationSlug: organization.slug,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, session.user.id));

  if (memberships.length === 0) redirect("/onboarding");

  const requestedScopes = scope?.split(/\s+/).filter(Boolean) ?? [];
  const clientLabel = client?.name?.trim() || "An external application";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-[520px] overflow-hidden rounded-xl border border-border bg-surface">
        <div className="px-7 pb-7 pt-6">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
            Authorize
          </div>
          <h2
            className="mb-1.5 text-[22px] font-semibold tracking-tight text-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {clientLabel} wants access to Arin
          </h2>
          <p className="mb-5 text-[13px] leading-relaxed text-text-muted">
            Signed in as <span className="text-text">{session.user.email}</span>.
            {memberships.length > 1
              ? " Choose which workspace this app should read and write."
              : " This app will act inside your workspace."}
          </p>

          {requestedScopes.length > 0 ? (
            <div className="mb-5 rounded-md border border-border bg-surface-hover px-3 py-2.5">
              <div className="mb-1 text-[11px] uppercase tracking-wider text-text-subtle">
                Requested scopes
              </div>
              <div className="flex flex-wrap gap-1.5">
                {requestedScopes.map((s) => (
                  <code
                    key={s}
                    className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-text"
                  >
                    {s}
                  </code>
                ))}
              </div>
            </div>
          ) : null}

          <form action={approveConsent} className="flex flex-col gap-3">
            <input type="hidden" name="consent_code" value={code} />

            {memberships.length === 1 ? (
              <input
                type="hidden"
                name="organization_id"
                value={memberships[0]!.organizationId}
              />
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-[12px] text-text-muted">Workspace</label>
                <div className="flex flex-col gap-1.5">
                  {memberships.map((m, i) => (
                    <label
                      key={m.organizationId}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-surface-hover px-3 py-2 text-[13px] text-text"
                    >
                      <input
                        type="radio"
                        name="organization_id"
                        value={m.organizationId}
                        defaultChecked={i === 0}
                        required
                      />
                      <span className="flex-1">{m.organizationName}</span>
                      <span className="font-mono text-[11px] text-text-subtle">
                        {m.organizationSlug}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-2 flex gap-2">
              <button
                type="submit"
                className="h-9 flex-1 rounded-md bg-accent text-[13px] font-medium text-white transition disabled:opacity-60"
              >
                Allow access
              </button>
              <button
                type="submit"
                formAction={denyConsent}
                formNoValidate
                className="h-9 rounded-md border border-border bg-surface-hover px-4 text-[13px] font-medium text-text transition"
              >
                Deny
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
