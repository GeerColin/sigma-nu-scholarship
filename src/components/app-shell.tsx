import Link from "next/link";
import {
  BarChart3,
  BookOpenCheck,
  Clock3,
  House,
  Mail,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const nav = [
  { label: "Dashboard", href: "/", icon: House },
  { label: "Members", href: "/members", icon: Users },
  { label: "This Week", href: "/this-week", icon: BookOpenCheck },
  { label: "Study Hours", href: "/study-hours", icon: Clock3 },
  { label: "Email", href: "/email", icon: Mail },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Administration", href: "/administration", icon: ShieldCheck },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16.5rem_1fr]">
      <aside className="hidden border-r bg-[var(--navy)] text-white lg:flex lg:min-h-screen lg:flex-col">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <BrandMark />
          <div>
            <p className="leading-tight font-bold">Sigma Nu</p>
            <p className="text-sm text-white/65">Eta Chapter</p>
          </div>
        </div>
        <nav
          aria-label="Scholarship administration"
          className="flex-1 space-y-1 px-3 py-5"
        >
          {nav.map(({ label, href, icon: Icon }, index) => (
            <Link
              key={href}
              href={href}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-semibold transition hover:bg-white/10 ${index === 0 ? "bg-white/12 text-white" : "text-white/72"}`}
            >
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="text-sm font-semibold">Jordan Carter</p>
          <p className="text-xs text-white/60">Scholarship Chair</p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex min-h-17 items-center justify-between border-b bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <BrandMark />
            <p className="font-bold text-[var(--navy)]">Scholarship</p>
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-[var(--muted)]">
              Sigma Nu · Eta Chapter · Mercer University
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[var(--muted)] sm:inline">
              Fall 2026
            </span>
            <div
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full bg-[var(--navy)] text-sm font-bold text-white"
            >
              JC
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[90rem] p-4 pb-24 sm:p-6 lg:p-8">
          {children}
        </main>
        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t bg-white px-2 py-2 shadow-[0_-8px_24px_rgba(17,41,75,0.08)] lg:hidden"
        >
          {nav.slice(0, 4).map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface-subtle)]"
            >
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
