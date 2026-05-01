"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/settings", label: "General", exact: true },
  { href: "/settings/pipelines", label: "Pipelines" },
  { href: "/settings/temperature", label: "Temperature" },
  { href: "/settings/tokens", label: "Service Tokens" },
  { href: "/settings/members", label: "Members" },
  { href: "/settings/account", label: "Account" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full bg-background">
      <nav className="flex w-[180px] shrink-0 flex-col gap-px border-r border-border px-2.5 py-5">
        <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
          Settings
        </div>
        {SECTIONS.map((s) => {
          const active = s.exact ? pathname === s.href : pathname === s.href;
          return (
            <Link
              key={s.href}
              href={s.href}
              className={cn(
                "flex h-[30px] items-center rounded-[5px] px-2.5 text-[13px] transition",
                active
                  ? "bg-accent-subtle font-medium text-accent"
                  : "text-text-muted hover:bg-surface-hover hover:text-text",
              )}
            >
              {s.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1 overflow-y-auto px-8 py-6">{children}</div>
    </div>
  );
}
