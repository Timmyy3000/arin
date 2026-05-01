"use client";

import { useState, type FormEvent } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { issueServiceTokenAction, revokeServiceTokenAction } from "./actions";

type TokenRow = {
  id: string;
  name: string;
  lastUsed: string;
  created: string;
  revoked: boolean;
};

export function TokensClient({ tokens }: { tokens: TokenRow[] }) {
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [issued, setIssued] = useState<{ token: string; copied: boolean } | null>(null);
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

  async function copy() {
    if (!issued) return;
    await navigator.clipboard.writeText(issued.token);
    setIssued({ ...issued, copied: true });
    setTimeout(() => setIssued((cur) => (cur ? { ...cur, copied: false } : cur)), 1500);
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
            <Button variant="outline" size="sm" type="button" onClick={copy}>
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
          <details className="mt-4 text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              Wire into Claude Code (HTTP MCP)
            </summary>
            <pre className="mt-2 overflow-x-auto rounded bg-background p-3 font-mono text-[11px]">
{`{
  "mcpServers": {
    "arin": {
      "type": "http",
      "url": "${typeof window !== "undefined" ? window.location.origin : ""}/api/mcp",
      "headers": {
        "Authorization": "Bearer ${issued.token}"
      }
    }
  }
}`}
            </pre>
          </details>
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="rounded-md border border-border p-4"
      >
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
