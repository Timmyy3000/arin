"use client";

import { useState, type FormEvent } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SERVICE_TOKEN_PLACEHOLDER,
  claudeCodeMacCommand,
  claudeCodeWindowsCommand,
  claudeWebBlock,
  claudeWebFields,
  codexMacCommand,
  codexWindowsCommand,
  genericHttpConfig,
  mcpServerUrl,
} from "./connection-guides";
import { issueServiceTokenAction, revokeServiceTokenAction } from "./actions";

type TokenRow = {
  id: string;
  name: string;
  lastUsed: string;
  created: string;
  revoked: boolean;
};

function CodeBlock({
  label,
  value,
  copiedKey,
  onCopy,
}: {
  label: string;
  value: string;
  copiedKey: string | null;
  onCopy: (key: string, value: string) => Promise<void>;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-subtle">
          {label}
        </div>
        <Button
          variant="outline"
          size="xs"
          type="button"
          onClick={() => onCopy(label, value)}
        >
          {copiedKey === label ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-lg border border-border/60 bg-background px-3 py-3 font-mono text-[11px] leading-5 text-text">
        {value}
      </pre>
    </div>
  );
}

function ConnectionGuide({
  appUrl,
  token,
  copiedKey,
  onCopy,
}: {
  appUrl: string;
  token?: string;
  copiedKey: string | null;
  onCopy: (key: string, value: string) => Promise<void>;
}) {
  const fields = claudeWebFields(appUrl);
  const tokenReady = Boolean(token?.trim());
  const mcpUrl = mcpServerUrl(appUrl);

  return (
    <div className="rounded-md border border-border bg-surface-hover/40 p-4">
      <div className="flex flex-col gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-text">Connect a client</h3>
            <p className="mt-1 max-w-[62ch] text-[12px] leading-5 text-text-muted">
              Claude Web signs in with OAuth. Claude Code, Codex, and most HTTP MCP
              clients use a service token in the `Authorization` header.
            </p>
          </div>
          <Button variant="outline" size="xs" type="button" onClick={() => onCopy("mcp-url", mcpUrl)}>
            {copiedKey === "mcp-url" ? (
              <>
                <Check className="h-3 w-3" />
                Copied URL
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy URL
              </>
            )}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-subtle">
          <span className="rounded-full border border-border/70 bg-background px-2 py-1 font-mono text-text-muted">
            {mcpUrl}
          </span>
          <span>
            {tokenReady
              ? "The snippets below already use the token you just created."
              : `Generate a token first for the service-token tabs below. Existing token values are not shown again.`}
          </span>
        </div>
      </div>

      <Tabs defaultValue="claude-web" className="mt-4 gap-4">
        <TabsList variant="line" className="w-full flex-wrap justify-start gap-2 p-0">
          <TabsTrigger value="claude-web" className="flex-none px-0 py-1.5 text-[12px]">
            Claude Web
          </TabsTrigger>
          <TabsTrigger value="claude-code" className="flex-none px-0 py-1.5 text-[12px]">
            Claude Code
          </TabsTrigger>
          <TabsTrigger value="codex" className="flex-none px-0 py-1.5 text-[12px]">
            Codex
          </TabsTrigger>
          <TabsTrigger value="generic" className="flex-none px-0 py-1.5 text-[12px]">
            Generic MCP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="claude-web" className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
            <div className="text-[12px] leading-5 text-text-muted">
              Add a custom connector in Claude, then paste the server URL below. Leave
              both OAuth client fields blank so Claude uses your server&apos;s discovery flow.
            </div>
          </div>
          <div className="grid gap-2">
            {[
              ["claude-web-name", "Name", fields.name],
              ["claude-web-url", "Remote MCP server URL", fields.remoteMcpServerUrl],
              ["claude-web-client-id", "OAuth Client ID", fields.oauthClientId],
              ["claude-web-client-secret", "OAuth Client Secret", fields.oauthClientSecret],
            ].map(([key, label, value]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-subtle">
                    {label}
                  </div>
                  <div className="mt-1 truncate font-mono text-[11px] text-text">
                    {value}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  type="button"
                  onClick={() => onCopy(key, value)}
                >
                  {copiedKey === key ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
          <CodeBlock
            label="Claude Web values"
            value={claudeWebBlock(appUrl)}
            copiedKey={copiedKey}
            onCopy={onCopy}
          />
        </TabsContent>

        <TabsContent value="claude-code" className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
            <div className="text-[12px] leading-5 text-text-muted">
              Use Claude Code&apos;s HTTP MCP transport. These commands add Arin directly
              with the bearer token header already attached.
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <CodeBlock
              label="macOS / Linux"
              value={claudeCodeMacCommand(appUrl, token)}
              copiedKey={copiedKey}
              onCopy={onCopy}
            />
            <CodeBlock
              label="Windows PowerShell"
              value={claudeCodeWindowsCommand(appUrl, token)}
              copiedKey={copiedKey}
              onCopy={onCopy}
            />
          </div>
        </TabsContent>

        <TabsContent value="codex" className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
            <div className="text-[12px] leading-5 text-text-muted">
              Codex CLI and the IDE extension share the same MCP configuration. Set the
              token in an environment variable, then register Arin once with `codex mcp add`.
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <CodeBlock
              label="macOS / Linux"
              value={codexMacCommand(appUrl, token)}
              copiedKey={copiedKey}
              onCopy={onCopy}
            />
            <CodeBlock
              label="Windows PowerShell"
              value={codexWindowsCommand(appUrl, token)}
              copiedKey={copiedKey}
              onCopy={onCopy}
            />
          </div>
        </TabsContent>

        <TabsContent value="generic" className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
            <div className="text-[12px] leading-5 text-text-muted">
              Use this for any remote HTTP MCP client that accepts a URL plus custom
              headers. Replace the placeholder token if you haven&apos;t just generated one.
            </div>
          </div>
          <CodeBlock
            label="HTTP MCP config"
            value={genericHttpConfig(appUrl, token)}
            copiedKey={copiedKey}
            onCopy={onCopy}
          />
          {!tokenReady ? (
            <p className="text-[11px] text-text-subtle">
              Placeholder shown: `{SERVICE_TOKEN_PLACEHOLDER}`. Generate a new token
              above to get a real value you can copy once.
            </p>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function TokensClient({
  appUrl,
  tokens,
}: {
  appUrl: string;
  tokens: TokenRow[];
}) {
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [issued, setIssued] = useState<{ token: string; copied: boolean } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      const result = await issueServiceTokenAction(fd);
      setIssued({ token: result.token, copied: false });
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to issue token.");
    } finally {
      setPending(false);
    }
  }

  async function copyIssuedToken() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.token);
      setIssued({ ...issued, copied: true });
      setTimeout(() => setIssued((cur) => (cur ? { ...cur, copied: false } : cur)), 1500);
    } catch {
      setError("Couldn't copy to clipboard. Copy the token manually.");
    }
  }

  async function copyValue(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
    } catch {
      setError("Couldn't copy to clipboard. Copy the value manually.");
    }
  }

  return (
    <div className="space-y-6">
      {issued ? (
        <div className="rounded-md border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Token created — copy it now</h3>
            <button
              onClick={() => setIssued(null)}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              dismiss
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            This is the only time you&apos;ll see it. If you lose it, revoke and issue a new one.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-background px-3 py-2 font-mono text-xs">
              {issued.token}
            </code>
            <Button variant="outline" size="sm" type="button" onClick={copyIssuedToken}>
              {issued.copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy
                </>
              )}
            </Button>
          </div>
          <p className="mt-3 text-[12px] text-text-muted">
            The setup snippets below now use this token automatically for Claude Code,
            Codex, and generic HTTP MCP clients.
          </p>
        </div>
      ) : null}

      <ConnectionGuide
        appUrl={appUrl}
        token={issued?.token}
        copiedKey={copiedKey}
        onCopy={copyValue}
      />

      <form onSubmit={onSubmit} className="rounded-md border border-border p-4">
        <h3 className="text-sm font-medium">Issue a new token</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Name it for the client that will use it (e.g. &quot;Claude Code laptop&quot;).
        </p>
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="token-name">Name</Label>
            <Input
              id="token-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Claude Code laptop"
              required
            />
          </div>
          <Button type="submit" disabled={pending || name.trim().length === 0}>
            {pending ? "Generating…" : "Generate"}
          </Button>
        </div>
        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      </form>

      <div>
        <h3 className="mb-2 text-sm font-medium">Existing tokens</h3>
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tokens yet.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Last used</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {tokens.map((t, i) => (
                  <tr key={t.id} className={i > 0 ? "border-t border-border/60" : ""}>
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.lastUsed}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.created}</td>
                    <td className="px-4 py-3">
                      {t.revoked ? (
                        <span className="text-xs text-muted-foreground">revoked</span>
                      ) : (
                        <span className="text-xs text-emerald-400">active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.revoked ? null : (
                        <form action={revokeServiceTokenAction}>
                          <input type="hidden" name="id" value={t.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            Revoke
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
