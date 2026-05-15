export const SERVICE_TOKEN_ENV_VAR = "ARIN_MCP_TOKEN";
export const SERVICE_TOKEN_PLACEHOLDER = "arin_your_token_here";

function bearerValue(token?: string): string {
  return `Bearer ${token?.trim() || SERVICE_TOKEN_PLACEHOLDER}`;
}

export function mcpServerUrl(appUrl: string): string {
  return `${appUrl}/api/mcp`;
}

export function claudeWebFields(appUrl: string) {
  return {
    name: "Arin",
    remoteMcpServerUrl: mcpServerUrl(appUrl),
    oauthClientId: "Leave blank",
    oauthClientSecret: "Leave blank",
  };
}

export function claudeWebBlock(appUrl: string): string {
  const fields = claudeWebFields(appUrl);
  return [
    `Name: ${fields.name}`,
    `Remote MCP server URL: ${fields.remoteMcpServerUrl}`,
    `OAuth Client ID: ${fields.oauthClientId}`,
    `OAuth Client Secret: ${fields.oauthClientSecret}`,
  ].join("\n");
}

export function claudeCodeMacCommand(appUrl: string, token?: string): string {
  return [
    "claude mcp add --transport http arin \\",
    `  ${mcpServerUrl(appUrl)} \\`,
    `  --header "Authorization: ${bearerValue(token)}"`,
  ].join("\n");
}

export function claudeCodeWindowsCommand(appUrl: string, token?: string): string {
  return [
    "claude mcp add --transport http arin `",
    `  ${mcpServerUrl(appUrl)} \``,
    `  --header 'Authorization: ${bearerValue(token)}'`,
  ].join("\n");
}

export function codexMacCommand(appUrl: string, token?: string): string {
  return [
    `export ${SERVICE_TOKEN_ENV_VAR}="${token?.trim() || SERVICE_TOKEN_PLACEHOLDER}"`,
    `codex mcp add arin --url ${mcpServerUrl(appUrl)} --bearer-token-env-var ${SERVICE_TOKEN_ENV_VAR}`,
    "codex mcp list",
  ].join("\n");
}

export function codexWindowsCommand(appUrl: string, token?: string): string {
  return [
    `$env:${SERVICE_TOKEN_ENV_VAR}="${token?.trim() || SERVICE_TOKEN_PLACEHOLDER}"`,
    `codex mcp add arin --url ${mcpServerUrl(appUrl)} --bearer-token-env-var ${SERVICE_TOKEN_ENV_VAR}`,
    "codex mcp list",
  ].join("\n");
}

export function genericHttpConfig(appUrl: string, token?: string): string {
  return `{
  "mcpServers": {
    "arin": {
      "type": "http",
      "url": "${mcpServerUrl(appUrl)}",
      "headers": {
        "Authorization": "${bearerValue(token)}"
      }
    }
  }
}`;
}
