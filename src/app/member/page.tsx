import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function MemberHomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl p-4 pb-24 sm:p-7">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-bold text-[var(--navy)]">My Scholarship</p>
            <p className="text-sm text-[var(--muted)]">Fall 2026 · Week 5</p>
          </div>
        </div>
        <Badge tone="success">Active</Badge>
      </header>
      <p className="text-sm font-bold tracking-[0.14em] text-[var(--warning)] uppercase">
        Sunday, September 6
      </p>
      <h1 className="mt-1 text-4xl font-bold text-[var(--navy)]">
        Good evening, Alex
      </h1>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <Card className="border-0 bg-[var(--navy)] text-white">
          <CardContent>
            <p className="text-sm font-semibold text-white/70">
              Weekly grade check-in
            </p>
            <div className="mt-3 flex items-center gap-2 text-2xl font-bold">
              <CheckCircle2 className="size-6 text-[var(--gold)]" />
              Submitted
            </div>
            <p className="mt-2 text-sm text-white/65">
              Friday at 8:42 PM · On time
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm font-semibold text-[var(--muted)]">
              Estimated Fall 2026 GPA
            </p>
            <p className="mt-2 text-4xl font-bold text-[var(--navy)]">3.24</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Based on 4 of 5 active courses. This estimate may differ from your
              official university GPA.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm font-semibold text-[var(--muted)]">
              Study hours
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <p className="text-2xl font-bold">2</p>
                <p className="text-sm text-[var(--muted)]">Required</p>
              </div>
              <div>
                <p className="text-2xl font-bold">1</p>
                <p className="text-sm text-[var(--muted)]">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--warning)]">1</p>
                <p className="text-sm text-[var(--muted)]">Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm font-semibold text-[var(--muted)]">
              Next deadline
            </p>
            <p className="mt-2 text-2xl font-bold text-[var(--navy)]">
              Friday, September 11
            </p>
            <p className="mt-1 text-[var(--muted)]">11:59 PM</p>
          </CardContent>
        </Card>
      </div>
      <nav
        aria-label="Member navigation"
        className="mt-7 grid gap-3 sm:grid-cols-4"
      >
        {(
          [
            ["Weekly Check-In", "/member/check-in"],
            ["My Courses", "/member/courses"],
            ["My Study Hours", "/member/study-hours"],
            ["My History / Trends", "/member/history"],
          ] as const
        ).map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="min-h-12 rounded-xl border bg-white px-4 py-3 text-center font-semibold text-[var(--navy)] hover:bg-[var(--surface-subtle)]"
          >
            {label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
