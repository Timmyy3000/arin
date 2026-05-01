"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  CheckSquare,
  Compass,
  Handshake,
  LogOut,
  Search,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";
import { signOutAction } from "@/app/(app)/actions";
import { Avatar } from "@/components/avatar-init";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Cockpit", icon: Compass, exact: true },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/people", label: "People", icon: Users },
  { href: "/deals", label: "Deals", icon: Handshake },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/meetings", label: "Meetings", icon: CalendarDays },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  orgName,
  userName,
  userEmail,
}: {
  orgName: string;
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-[200px] shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border-subtle px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px]"
            style={{ background: "oklch(0.35 0.14 250)" }}
          >
            <span
              className="font-mono text-[10px] font-bold"
              style={{ color: "oklch(0.80 0.12 250)" }}
            >
              A
            </span>
          </span>
          <span
            className="truncate text-[13px] font-semibold tracking-tight text-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {orgName}
          </span>
        </div>
      </div>
      <div className="px-2.5 pb-1.5 pt-2.5">
        <button
          type="button"
          className="flex h-[30px] w-full items-center gap-1.5 rounded-md border border-border bg-surface-hover px-2 text-[12px] text-text-muted transition hover:bg-surface-active"
        >
          <Search className="h-3 w-3" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded border border-border bg-surface-active px-1 font-mono text-[10px] text-text-subtle">
            ⌘K
          </kbd>
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-px px-2.5 pt-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-[5px] px-2.5 text-[13px] transition",
                active
                  ? "bg-accent-subtle text-accent font-medium"
                  : "text-text-muted hover:bg-surface-hover hover:text-text",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col gap-px px-2.5 pb-3">
        <Link
          href="/settings"
          className={cn(
            "flex h-8 items-center gap-2.5 rounded-[5px] px-2.5 text-[13px] transition",
            isActive(pathname, "/settings")
              ? "bg-accent-subtle text-accent font-medium"
              : "text-text-muted hover:bg-surface-hover hover:text-text",
          )}
        >
          <SettingsIcon className="h-3.5 w-3.5" />
          Settings
        </Link>
        <div className="my-1.5 h-px bg-border-subtle" />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-[5px] px-2 py-1 text-left transition hover:bg-surface-hover">
            <Avatar name={userName} size={24} />
            <span className="min-w-0 flex-1 truncate text-[12px] text-text-muted">
              {userName}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48">
            <div className="px-2 pb-1 pt-1.5 text-[11px] text-text-subtle">
              {userEmail}
            </div>
            <form action={signOutAction}>
              <DropdownMenuItem render={(props) => <button type="submit" {...props} />}>
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
