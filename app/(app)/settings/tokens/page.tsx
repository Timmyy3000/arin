export default function ServiceTokensSettingsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-medium">Service tokens</h2>
      <p className="text-sm text-muted-foreground">
        Service tokens authenticate Claude (over MCP) to your org. Each token is shown
        once at creation; store it in your MCP client config.
      </p>
      <p className="text-xs text-muted-foreground">
        Token generation, revoke, and the MCP config snippet land in Phase 3.
      </p>
    </div>
  );
}
