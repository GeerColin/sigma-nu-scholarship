import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getCurrentUserContext } from "@/lib/auth/context";
import { isDemoMode } from "@/lib/env";

const weeklyStatus = [
  { label: "On time", value: 42, tone: "success" as const },
  { label: "Late", value: 3, tone: "warning" as const },
  { label: "Missing", value: 5, tone: "danger" as const },
];

const attention = [
  {
    title: "5 weekly check-ins are missing",
    detail: "Deadline passed Friday at 11:59 PM",
    action: "Review missing",
    href: "/this-week?status=missing",
    icon: BookOpenCheck,
    tone: "danger",
  },
  {
    title: "2 significant grade changes",
    detail: "Secure academic review required",
    action: "Review alerts",
    href: "/members?filter=alerts",
    icon: AlertTriangle,
    tone: "warning",
  },
  {
    title: "14 study-hour emails are ready",
    detail: "Assignments are calculated but not yet frozen",
    action: "Review batch",
    href: "/email",
    icon: Mail,
    tone: "navy",
  },
] as const;

export default async function DashboardPage() {
  if (!isDemoMode) {
    const context = await getCurrentUserContext();
    if (!context) redirect("/login");
    if (!context.memberId)
      redirect(
        context.accessRequestStatus ? "/awaiting-approval" : "/request-access",
      );
    if (
      !context.roles.includes("admin") &&
      !context.roles.includes("scholarship_chair")
    )
      redirect("/member");
  }
  return (
    <AppShell>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-bold tracking-[0.16em] text-[var(--warning)] uppercase">
            Sunday, September 6
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--navy)] sm:text-4xl">
            Good evening, Jordan
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            Fall 2026 · Week 5 · Here’s what needs attention.
          </p>
        </div>
        <Badge tone="success" className="w-fit gap-2 py-2">
          <CheckCircle2 className="size-4" /> System ready
        </Badge>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="overflow-hidden border-0 bg-[var(--navy)] text-white sm:col-span-2 xl:col-span-1">
          <CardContent>
            <div className="mb-5 flex items-center justify-between">
              <p className="font-semibold text-white/70">Next deadline</p>
              <Clock3 className="size-5 text-[var(--gold)]" />
            </div>
            <p className="text-2xl font-bold">Friday, Sept. 11</p>
            <p className="mt-1 text-white/70">11:59 PM · America/New_York</p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full w-[62%] rounded-full bg-[var(--gold)]" />
            </div>
          </CardContent>
        </Card>
        {weeklyStatus.map((status) => (
          <Card key={status.label}>
            <CardContent>
              <p className="text-sm font-semibold text-[var(--muted)]">
                Weekly check-ins
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-4xl font-bold tracking-tight text-[var(--navy)]">
                  {status.value}
                </p>
                <Badge tone={status.tone}>{status.label}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--navy)]">
                Needs attention
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Review these before the next deadline.
              </p>
            </div>
            <Badge tone="danger">3 items</Badge>
          </CardHeader>
          <div className="divide-y">
            {attention.map(
              ({ title, detail, action, href, icon: Icon, tone }) => (
                <div
                  key={title}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
                >
                  <div
                    className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone === "danger" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : tone === "warning" ? "bg-[var(--warning-soft)] text-[var(--warning)]" : "bg-[var(--surface-subtle)] text-[var(--navy)]"}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[var(--foreground)]">
                      {title}
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--muted)]">
                      {detail}
                    </p>
                  </div>
                  <Link
                    href={href}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-2.5 font-semibold text-[var(--navy)] shadow-none ring-1 ring-[var(--border)] transition hover:bg-[var(--surface-subtle)] sm:w-auto"
                  >
                    {action}
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </div>
              ),
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-[var(--navy)]">
              Study hours
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Week 5 completion
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <span className="text-5xl font-bold tracking-tight text-[var(--navy)]">
                  76%
                </span>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  of assigned hours complete
                </p>
              </div>
              <div className="grid size-16 place-items-center rounded-full border-8 border-[var(--success)]/20 text-sm font-bold text-[var(--success)]">
                76
              </div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
              <div className="h-full w-[76%] rounded-full bg-[var(--success)]" />
            </div>
            <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-sm text-[var(--muted)]">Complete</dt>
                <dd className="mt-1 text-2xl font-bold text-[var(--navy)]">
                  31
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--muted)]">In progress</dt>
                <dd className="mt-1 text-2xl font-bold text-[var(--navy)]">
                  12
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--muted)]">Not started</dt>
                <dd className="mt-1 text-2xl font-bold text-[var(--navy)]">
                  7
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
