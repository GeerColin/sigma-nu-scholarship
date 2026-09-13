"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  CircleHelp,
  Clock3,
  House,
  Mail,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

const items = [
  { label: "Dashboard", href: "/", icon: House },
  { label: "Members", href: "/members", icon: Users },
  { label: "This Week", href: "/this-week", icon: BookOpenCheck },
  { label: "Study Hours", href: "/study-hours", icon: Clock3 },
  { label: "Email", href: "/email", icon: Mail },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Administration", href: "/administration", icon: ShieldCheck },
  { label: "Chair Guide", href: "/guide", icon: CircleHelp },
] as const;

function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export function AdminNavigation({
  variant,
}: {
  variant: "desktop" | "menu" | "mobile";
}) {
  const pathname = usePathname();
  const visibleItems = variant === "mobile" ? items.slice(0, 4) : items;

  return visibleItems.map(({ label, href, icon: Icon }) => {
    const active = isCurrent(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={
          variant === "desktop"
            ? `flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-semibold transition hover:bg-white/10 hover:text-white ${active ? "bg-white/12 text-white" : "text-white/80"}`
            : variant === "menu"
              ? `flex min-h-11 items-center gap-3 rounded-lg px-3 font-semibold text-[var(--navy)] ${active ? "bg-[var(--surface-subtle)]" : "hover:bg-[var(--surface-subtle)]"}`
              : `flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold ${active ? "bg-[var(--surface-subtle)] text-[var(--navy)]" : "text-[var(--muted)] hover:bg-[var(--surface-subtle)]"}`
        }
      >
        <Icon aria-hidden="true" className="size-5" />
        {label}
      </Link>
    );
  });
}
