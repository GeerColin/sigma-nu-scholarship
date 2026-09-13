import { LogOut, Menu } from "lucide-react";
import { AdminNavigation } from "@/components/admin-navigation";
import { BrandMark } from "@/components/brand-mark";
import { signOut } from "@/features/auth/actions";

type AppShellProps = {
  children: React.ReactNode;
  viewer: { name: string; email: string; role: string };
  chapter: {
    fraternityName: string;
    chapterName: string;
    institutionName: string;
  } | null;
  academicPeriod: {
    semesterName: string;
    weekLabel: string | null;
    timezone: string;
  } | null;
};

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return letters || "SN";
}

export function AppShell({
  children,
  viewer,
  chapter,
  academicPeriod,
}: AppShellProps) {
  const periodLabel = academicPeriod
    ? [academicPeriod.semesterName, academicPeriod.weekLabel]
        .filter(Boolean)
        .join(" · ")
    : "No active semester";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16.5rem_1fr]">
      <a
        href="#main-content"
        className="sr-only z-50 rounded bg-white p-3 font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>
      <aside className="hidden border-r bg-[var(--navy)] text-white lg:flex lg:min-h-screen lg:flex-col">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <BrandMark />
          <div className="min-w-0">
            <p className="truncate leading-tight font-bold">
              {chapter?.fraternityName ?? "Scholarship"}
            </p>
            <p className="truncate text-sm text-white/65">
              {chapter?.chapterName ?? "Chapter unavailable"}
            </p>
          </div>
        </div>
        <nav
          aria-label="Scholarship administration"
          className="flex-1 space-y-1 px-3 py-5"
        >
          <AdminNavigation variant="desktop" />
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-semibold">{viewer.name}</p>
          <p className="text-xs text-white/60">{viewer.role}</p>
          <p className="mt-0.5 truncate text-xs text-white/60">
            {viewer.email}
          </p>
          <form action={signOut} className="mt-3">
            <button
              type="submit"
              className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold text-white/72 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Sign out
            </button>
          </form>
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
              {chapter
                ? `${chapter.fraternityName} · ${chapter.chapterName} · ${chapter.institutionName}`
                : "Chapter details unavailable"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[var(--muted)] sm:inline">
              {periodLabel}
            </span>
            <details className="relative lg:hidden">
              <summary
                aria-label="Open navigation"
                className="grid size-10 cursor-pointer list-none place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)]"
              >
                <Menu aria-hidden="true" className="size-5" />
              </summary>
              <nav
                aria-label="All administration pages"
                className="absolute top-12 right-0 z-30 grid w-64 gap-1 rounded-xl border bg-white p-2 shadow-xl"
              >
                <AdminNavigation variant="menu" />
              </nav>
            </details>
            <div
              aria-label={`${viewer.name}, ${viewer.role}`}
              className="grid size-9 place-items-center rounded-full bg-[var(--navy)] text-sm font-bold text-white"
            >
              {initials(viewer.name)}
            </div>
            <form action={signOut} className="lg:hidden">
              <button
                type="submit"
                aria-label="Sign out"
                className="grid size-10 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-subtle)] hover:text-[var(--navy)]"
              >
                <LogOut aria-hidden="true" className="size-5" />
              </button>
            </form>
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto max-w-[90rem] p-4 pb-24 sm:p-6 lg:p-8"
        >
          {children}
        </main>
        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t bg-white px-2 py-2 shadow-[0_-8px_24px_rgba(17,41,75,0.08)] lg:hidden"
        >
          <AdminNavigation variant="mobile" />
        </nav>
      </div>
    </div>
  );
}
