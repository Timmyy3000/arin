import Link from "next/link";

const SECTIONS = [
  { href: "/settings", label: "General" },
  { href: "/settings/pipelines", label: "Pipelines" },
  { href: "/settings/temperature", label: "Temperature" },
  { href: "/settings/tokens", label: "Service Tokens" },
  { href: "/settings/members", label: "Members" },
  { href: "/settings/account", label: "Account" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>
      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav className="space-y-1 text-sm">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="block rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
