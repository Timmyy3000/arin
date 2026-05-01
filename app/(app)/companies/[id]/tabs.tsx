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
    <div className="border-b border-border/60 px-8">
      <nav className="-mb-px flex gap-6">
        {TABS.map((t) => {
          const href = t.slug ? `${base}/${t.slug}` : base;
          const active = t.slug ? pathname === href : pathname === base;
          return (
            <Link
              key={t.slug}
              href={href}
              className={cn(
                "border-b-2 px-1 py-3 text-sm transition",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
