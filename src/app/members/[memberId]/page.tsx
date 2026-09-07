import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  await params;
  return (
    <AppShell>
      <DemoBanner />
      <PageHeading
        eyebrow="Member profile"
        title="Cameron Lee"
        description="Active member · Google account linked"
        action={
          <Link
            href="/members"
            className="font-semibold text-[var(--navy)] hover:underline"
          >
            Back to members
          </Link>
        }
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm font-semibold text-[var(--muted)]">
              Estimated Fall 2026 GPA
            </p>
            <p className="mt-2 text-4xl font-bold text-[var(--navy)]">2.84</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Based on 4 of 5 active courses. This estimate may differ from the
              official university GPA.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm font-semibold text-[var(--muted)]">
              Week 5 study hours
            </p>
            <p className="mt-2 text-4xl font-bold text-[var(--navy)]">
              1 <span className="text-xl text-[var(--muted)]">of 2</span>
            </p>
            <Badge tone="warning" className="mt-3">
              1 hour remaining
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm font-semibold text-[var(--muted)]">
              Academic review
            </p>
            <p className="mt-2 text-xl font-bold text-[var(--navy)]">
              Grade change detected
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              One course changed by more than the configured threshold.
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-5">
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Current courses
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Calculus II", "81.5%", "4 credits"],
              ["Chemistry", "B", "4 credits"],
              ["Great Books", "Pass", "3 credits · excluded from estimate"],
              [
                "Engineering Seminar",
                "Satisfactory",
                "1 credit · excluded from estimate",
              ],
            ].map(([name, grade, meta]) => (
              <div key={name} className="rounded-xl border p-4">
                <div className="flex justify-between gap-3">
                  <p className="font-bold text-[var(--navy)]">{name}</p>
                  <p className="font-bold">{grade}</p>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">{meta}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
