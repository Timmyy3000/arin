import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { env } from "./env";

const socialProviders =
  env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
    ? {
        github: {
          clientId: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
        },
      }
    : undefined;

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db(), { provider: "pg", schema }),
  emailAndPassword: { enabled: true, autoSignIn: true },
  socialProviders,
  plugins: [organization(), nextCookies()],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
