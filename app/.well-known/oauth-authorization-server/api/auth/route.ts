import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { auth } from "@/lib/auth";

// RFC 8414 path-aware metadata location; bare-root variant stays for back-compat.
export const GET = oauthProviderAuthServerMetadata(auth);
