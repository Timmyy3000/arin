import { env } from "@/lib/env";

export function GET() {
  return Response.json({
    resource: `${env.APP_URL}/api/mcp`,
    authorization_servers: [`${env.APP_URL}/api/auth`],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp"],
  });
}
