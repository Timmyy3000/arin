import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { serviceTokens } from "@/db/schema/settings";
import { relativeTime } from "@/lib/format";
import { requireOrgSession } from "@/lib/session";
import { TokensClient } from "./tokens-client";

export default async function ServiceTokensSettingsPage() {
  const session = await requireOrgSession();
  const rows = await db()
    .select({
      id: serviceTokens.id,
      name: serviceTokens.name,
      lastUsedAt: serviceTokens.lastUsedAt,
      revokedAt: serviceTokens.revokedAt,
      createdAt: serviceTokens.createdAt,
    })
    .from(serviceTokens)
    .where(eq(serviceTokens.organizationId, session.organizationId))
    .orderBy(desc(serviceTokens.createdAt));

  return (
    <div className="max-w-[560px] space-y-5">
      <header>
        <h2
          className="text-base font-semibold tracking-tight text-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Service Tokens (MCP)
        </h2>
        <p className="mt-1 text-[12px] text-text-muted">
          Service tokens authenticate Claude (over MCP) to your workspace. Each token is
          shown once at creation — store it in your MCP client config.
        </p>
      </header>

      <TokensClient
        tokens={rows.map((r) => ({
          id: r.id,
          name: r.name,
          lastUsed: relativeTime(r.lastUsedAt),
          created: relativeTime(r.createdAt),
          revoked: r.revokedAt !== null,
        }))}
      />
    </div>
  );
}
