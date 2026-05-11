"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, MCP_AUDIENCE } from "@/lib/auth";
import { recordConsentChoice } from "@/lib/oauth-consent";
import { requireSession } from "@/lib/session";

async function consentRedirectUrl(accept: boolean): Promise<string> {
  const res = await auth.api.oauth2Consent({
    body: { accept },
    headers: await headers(),
    asResponse: true,
  });
  const location = res.headers.get("location");
  if (location) return location;
  const data = (await res.clone().json().catch(() => null)) as
    | { url?: string; redirect_uri?: string }
    | null;
  const url = data?.url ?? data?.redirect_uri;
  if (!url) throw new Error("oauth2Consent did not return a redirect URL");
  return url;
}

export async function approveConsent(formData: FormData): Promise<void> {
  const consentCode = String(formData.get("consent_code") ?? "");
  const organizationId = String(formData.get("organization_id") ?? "");
  if (!consentCode || !organizationId) {
    throw new Error("consent_code and organization_id are required");
  }
  const session = await requireSession();
  await recordConsentChoice({
    consentCode,
    userId: session.user.id,
    organizationId,
    resource: MCP_AUDIENCE,
  });
  redirect(await consentRedirectUrl(true));
}

export async function denyConsent(): Promise<void> {
  await requireSession();
  redirect(await consentRedirectUrl(false));
}
