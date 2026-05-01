"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { slug: "", label: "Overview" },
  { slug: "signals", label: "Signals" },
  { slug: "research", label: "Research" },
  { slug: "people", label: "People" },
  { slug: "deals", label: "Deals" },
  { slug: "tasks", label: "Tasks" },
  { slug: "notes", label: "Notes" },
];

export function CompanyTabs({ companyId }: { companyId: string }) {
  const pathname = usePathname();
  const base = `/companies/${companyId}`;
  return (
    <nav className="-mb-px flex gap-0">
      {TABS.map((t) => {
        const href = t.slug ? `${base}/${t.slug}` : base;
        const active = t.slug ? pathname === href : pathname === base;
        return (
          <Link
            key={t.slug}
            href={href}
            className={cn(
              "border-b-2 px-3.5 py-2 text-[13px] transition",
              active
                ? "border-accent font-medium text-text"
                : "border-transparent text-text-muted hover:text-text",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
