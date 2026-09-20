import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ChairAppShell } from "@/components/chair-app-shell";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScheduleView } from "@/features/schedule/schedule-view";
import {
  getScheduleEntries,
  getScheduleWeeks,
} from "@/features/schedule/queries";
import { getActiveAcademicPeriod } from "@/lib/academic/calendar";
import { requireApprovedMemberContext } from "@/lib/auth/guards";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    date?: string;
    status?: string;
    error?: string;
  }>;
}) {
  const context = await requireApprovedMemberContext();
  const query = await searchParams;
  const period = await getActiveAcademicPeriod(context.chapterId!);
  const canManage = context.roles.some((role) =>
    ["admin", "scholarship_chair"].includes(role),
  );
  const isProctor = context.roles.includes("proctor");
  const content = !period ? (
    <Card>
      <CardContent>
        <h1 className="text-2xl font-bold text-[var(--navy)]">
          Study schedule
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          No active semester is configured yet.
        </p>
      </CardContent>
    </Card>
  ) : (
    <ScheduleContent
      period={period}
      query={query}
      canManage={canManage}
      proctorMemberId={isProctor ? context.memberId : null}
    />
  );
  const messages = (
    <>
      {query.status && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-[var(--success-soft)] p-4 font-semibold text-[var(--success)]"
        >
          The schedule change was saved.
        </p>
      )}
      {query.error && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-[var(--danger-soft)] p-4 font-semibold text-[var(--danger)]"
        >
          The schedule change could not be saved. Nothing else was changed.
        </p>
      )}
    </>
  );
  if (canManage) {
    return (
      <ChairAppShell>
        <div className="mb-7">
          <p className="text-sm font-bold tracking-[0.16em] text-[var(--warning)] uppercase">
            Chapter schedule
          </p>
          <h1 className="mt-1 text-4xl font-bold text-[var(--navy)]">
            Study schedule
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            Browse recurring proctor sessions, dated exceptions, locations, and
            assignments.
          </p>
        </div>
        {messages}
        {content}
      </ChairAppShell>
    );
  }
  return (
    <main className="mx-auto min-h-screen max-w-6xl p-4 pb-24 sm:p-7">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-bold text-[var(--navy)]">Study schedule</p>
            <p className="text-sm text-[var(--muted)]">
              {period ? period.semester.name : "No active semester"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <WorkspaceSwitcher
            active={isProctor ? "proctor" : "member"}
            canProctor={
              isProctor ||
              context.roles.some((role) =>
                ["admin", "scholarship_chair"].includes(role),
              )
            }
            canChair={context.roles.some((role) =>
              ["admin", "scholarship_chair"].includes(role),
            )}
          />
          <Badge tone="success">Approved</Badge>
        </div>
      </header>
      <h1 className="mb-2 text-4xl font-bold text-[var(--navy)]">
        Study schedule
      </h1>
      <p className="mb-7 text-[var(--muted)]">
        Read-only schedule for approved chapter members. Proctors can edit their
        own assigned future occurrence.
      </p>
      {messages}
      {content}
      <Link
        href={isProctor ? "/proctor" : "/member"}
        className="mt-6 inline-block font-semibold text-[var(--navy)] underline"
      >
        Back to workspace
      </Link>
    </main>
  );
}

async function ScheduleContent({
  period,
  query,
  canManage,
  proctorMemberId,
}: {
  period: NonNullable<Awaited<ReturnType<typeof getActiveAcademicPeriod>>>;
  query: { week?: string; date?: string };
  canManage: boolean;
  proctorMemberId: string | null;
}) {
  const weeks = await getScheduleWeeks(period.semester.id);
  const requestedDate =
    query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : null;
  const requestedSequence =
    query.week && /^\d+$/.test(query.week) ? Number(query.week) : null;
  const selectedWeek = requestedDate
    ? (weeks.find(
        (week) =>
          requestedDate >= week.startsOn && requestedDate <= week.endsOn,
      ) ?? null)
    : (weeks.find((week) => week.sequenceNumber === requestedSequence) ??
      weeks.find((week) => week.id === period.currentWeek?.id) ??
      weeks[0] ??
      null);
  const entries = selectedWeek
    ? await getScheduleEntries(
        period.semester.id,
        selectedWeek.startsOn,
        selectedWeek.endsOn,
      )
    : [];
  return (
    <ScheduleView
      weeks={weeks}
      selectedWeek={selectedWeek}
      entries={entries}
      canManage={canManage}
      proctorMemberId={proctorMemberId}
    />
  );
}
