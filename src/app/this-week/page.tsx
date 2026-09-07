import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function ThisWeekPage() {
  return (
    <AppShell>
      <DemoBanner />
      <PageHeading
        eyebrow="Fall 2026 · Week 5"
        title="Weekly check-ins"
        description="Deadline: Friday, September 4 at 11:59 PM · America/New_York"
        action={
          <Link
            href="/email?prepare=missing"
            className="inline-flex min-h-11 items-center rounded-xl bg-[var(--navy)] px-4 font-semibold text-white"
          >
            Prepare missing emails
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["On time", "42", "success"],
          ["Late", "3", "warning"],
          ["Missing", "5", "danger"],
        ].map(([label, value, tone]) => (
          <Card key={label}>
            <CardContent>
              <p className="text-sm font-semibold text-[var(--muted)]">
                {label}
              </p>
              <div className="mt-2 flex items-end justify-between">
                <p className="text-4xl font-bold text-[var(--navy)]">{value}</p>
                <Badge tone={tone as "success" | "warning" | "danger"}>
                  {label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-5">
        <CardContent>
          <h2 className="text-xl font-bold text-[var(--navy)]">Exceptions</h2>
          <div className="mt-4 divide-y">
            {[
              ["Cameron Lee", "Missing", "Not submitted"],
              ["Taylor Brooks", "Late", "Saturday, 12:14 AM"],
              ["Riley Bennett", "Missing", "Not submitted"],
            ].map(([name, status, time]) => (
              <div
                key={name}
                className="flex items-center justify-between gap-4 py-4"
              >
                <div>
                  <p className="font-bold text-[var(--navy)]">{name}</p>
                  <p className="text-sm text-[var(--muted)]">{time}</p>
                </div>
                <Badge tone={status === "Late" ? "warning" : "danger"}>
                  {status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
