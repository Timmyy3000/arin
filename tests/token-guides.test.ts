import { describe, expect, test } from "bun:test";
import {
  SERVICE_TOKEN_PLACEHOLDER,
  claudeCodeMacCommand,
  claudeCodeWindowsCommand,
  claudeWebBlock,
  codexMacCommand,
  codexWindowsCommand,
  genericHttpConfig,
  mcpServerUrl,
} from "@/app/(app)/settings/tokens/connection-guides";

const APP_URL = "https://arin.usedocsyde.com";
const TOKEN = "arin_real_token";

describe("token connection guides", () => {
  test("builds the canonical MCP URL from APP_URL", () => {
    expect(mcpServerUrl(APP_URL)).toBe("https://arin.usedocsyde.com/api/mcp");
  });

  test("Claude Web block points to the remote MCP URL and leaves OAuth client fields blank", () => {
    expect(claudeWebBlock(APP_URL)).toContain("Name: Arin");
    expect(claudeWebBlock(APP_URL)).toContain(
      "Remote MCP server URL: https://arin.usedocsyde.com/api/mcp",
    );
    expect(claudeWebBlock(APP_URL)).toContain("OAuth Client ID: Leave blank");
    expect(claudeWebBlock(APP_URL)).toContain("OAuth Client Secret: Leave blank");
  });

  test("service-token client snippets embed the issued token when present", () => {
    expect(claudeCodeMacCommand(APP_URL, TOKEN)).toContain(`Bearer ${TOKEN}`);
    expect(claudeCodeWindowsCommand(APP_URL, TOKEN)).toContain(`Bearer ${TOKEN}`);
    expect(codexMacCommand(APP_URL, TOKEN)).toContain(TOKEN);
    expect(codexWindowsCommand(APP_URL, TOKEN)).toContain(TOKEN);
    expect(genericHttpConfig(APP_URL, TOKEN)).toContain(`"Authorization": "Bearer ${TOKEN}"`);
  });

  test("service-token client snippets fall back to a placeholder when no token is available", () => {
    expect(claudeCodeMacCommand(APP_URL)).toContain(SERVICE_TOKEN_PLACEHOLDER);
    expect(codexMacCommand(APP_URL)).toContain(SERVICE_TOKEN_PLACEHOLDER);
    expect(genericHttpConfig(APP_URL)).toContain(SERVICE_TOKEN_PLACEHOLDER);
  });
});
