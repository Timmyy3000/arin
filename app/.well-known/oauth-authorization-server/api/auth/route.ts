import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { auth } from "@/lib/auth";

// Path-aware AS metadata location per RFC 8414. The bare-root variant in
// app/.well-known/oauth-authorization-server/route.ts stays for back-compat
// with anything that already cached it.
export const GET = oauthProviderAuthServerMetadata(auth);
