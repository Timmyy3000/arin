import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { jwt, organization } from "better-auth/plugins";
import { oauthProvider } from "@better-auth/oauth-provider";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { env } from "./env";
import { resolveConsentOrg } from "./oauth-consent";

const MCP_RESOURCE = `${env.APP_URL}/api/mcp`;

export const auth = betterAuth({
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db(), { provider: "pg", schema }),
  emailAndPassword: { enabled: true, autoSignIn: true },
  plugins: [
    organization(),
    jwt(),
    oauthProvider({
      validAudiences: [MCP_RESOURCE],
      allowDynamicClientRegistration: true,
      loginPage: "/sign-in",
      consentPage: "/oauth/consent",
      accessTokenExpiresIn: 60 * 60 * 24,
      refreshTokenExpiresIn: 60 * 60 * 24 * 30,
      customAccessTokenClaims: async ({ user, resource }) => {
        if (!user?.id) return {};
        const orgId = await resolveConsentOrg(user.id, resource);
        return orgId ? { org_id: orgId } : {};
      },
    }),
    nextCookies(),
  ],
});

export const MCP_AUDIENCE = MCP_RESOURCE;

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
