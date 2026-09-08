import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getActiveAcademicPeriod } from "@/lib/academic/calendar";
import { requireApprovedMemberContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

function hours(minutes: number) {
  return (minutes / 60).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export default async function MemberHomePage() {
  const context = await requireApprovedMemberContext();
  const period = await getActiveAcademicPeriod(context.chapterId!);
  const supabase = await createClient();
  let submission: {
    original_timing: "on_time" | "late";
    original_submitted_at: string;
    estimated_gpa_snapshot: number | string | null;
    included_course_count: number;
    active_course_count: number;
  } | null = null;
  let requiredMinutes: number | null = null;
  let completedMinutes = 0;

  if (period?.currentWeek) {
    const [submissionResult, assignmentResult, sessionsResult] =
      await Promise.all([
        supabase
          .from("grade_submissions")
          .select(
            "original_timing, original_submitted_at, estimated_gpa_snapshot, included_course_count, active_course_count",
          )
          .eq("member_id", context.memberId!)
          .eq("week_id", period.currentWeek.id)
          .eq("is_current", true)
          .maybeSingle(),
        supabase
          .from("study_hour_assignments")
          .select("final_hours")
          .eq("member_id", context.memberId!)
          .eq("week_id", period.currentWeek.id)
          .maybeSingle(),
        supabase
          .from("study_sessions")
          .select("duration_minutes")
          .eq("member_id", context.memberId!)
          .eq("week_id", period.currentWeek.id)
          .is("voided_at", null),
      ]);
    if (
      submissionResult.error ||
      assignmentResult.error ||
      sessionsResult.error
    ) {
      throw new Error("Could not load your scholarship dashboard.");
    }
    submission = submissionResult.data;
    requiredMinutes =
      assignmentResult.data?.final_hours === undefined
        ? null
        : Number(assignmentResult.data.final_hours) * 60;
    completedMinutes = (sessionsResult.data ?? []).reduce(
      (total, session) => total + session.duration_minutes,
      0,
    );
  }

  const remainingMinutes =
    requiredMinutes === null
      ? null
      : Math.max(requiredMinutes - completedMinutes, 0);

  return (
    <main className="mx-auto min-h-screen max-w-5xl p-4 pb-24 sm:p-7">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-bold text-[var(--navy)]">My Scholarship</p>
            <p className="text-sm text-[var(--muted)]">
              {period
                ? [period.semester.name, period.currentWeek?.label]
                    .filter(Boolean)
                    .join(" · ")
                : "No active semester"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {context.roles.includes("proctor") && (
            <Link
              href="/proctor"
              className="inline-flex min-h-11 items-center rounded-xl border px-4 font-semibold text-[var(--navy)]"
            >
              Proctor portal
            </Link>
          )}
          {context.roles.some((role) =>
            ["admin", "scholarship_chair"].includes(role),
          ) && (
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-xl border px-4 font-semibold text-[var(--navy)]"
            >
              Chair dashboard
            </Link>
          )}
          <Badge tone={context.status === "active" ? "success" : "neutral"}>
            {context.status ?? "Unknown"}
          </Badge>
        </div>
      </header>

      <p className="text-sm font-bold tracking-[0.14em] text-[var(--warning)] uppercase">
        Approved chapter account
      </p>
      <h1 className="mt-1 text-4xl font-bold text-[var(--navy)]">
        Welcome, {context.memberName}
      </h1>

      {!period || !period.currentWeek ? (
        <Card className="mt-7">
          <CardContent>
            <h2 className="text-xl font-bold text-[var(--navy)]">
              No current academic week
            </h2>
            <p className="mt-2 text-[var(--muted)]">
              Weekly check-ins and study-hour progress will appear after the
              Scholarship Chair configures an active semester covering today.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <Card className="border-0 bg-[var(--navy)] text-white">
            <CardContent>
              <p className="text-sm font-semibold text-white/70">
                Weekly grade check-in
              </p>
              <div className="mt-3 flex items-center gap-2 text-2xl font-bold">
                {submission ? (
                  <CheckCircle2 className="size-6 text-[var(--gold)]" />
                ) : (
                  <Clock3 className="size-6 text-[var(--gold)]" />
                )}
                {submission ? "Submitted" : "Not submitted"}
              </div>
              <p className="mt-2 text-sm text-white/65">
                {submission
                  ? new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(submission.original_submitted_at)) +
                    " · " +
                    (submission.original_timing === "on_time"
                      ? "On time"
                      : "Late")
                  : "Late submissions remain available."}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm font-semibold text-[var(--muted)]">
                Estimated {period.semester.name} GPA
              </p>
              <p className="mt-2 text-4xl font-bold text-[var(--navy)]">
                {submission?.estimated_gpa_snapshot === null ||
                submission?.estimated_gpa_snapshot === undefined
                  ? "—"
                  : Number(submission.estimated_gpa_snapshot).toFixed(2)}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {submission
                  ? "Based on " +
                    submission.included_course_count +
                    " of " +
                    submission.active_course_count +
                    " active courses. "
                  : "No submission for this week. "}
                This estimate may differ from your official university GPA.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm font-semibold text-[var(--muted)]">
                Study hours
              </p>
              {requiredMinutes === null ? (
                <p className="mt-3 text-[var(--muted)]">
                  No study-hour assignment yet.
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-2xl font-bold">
                      {hours(requiredMinutes)}
                    </p>
                    <p className="text-sm text-[var(--muted)]">Required</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {hours(completedMinutes)}
                    </p>
                    <p className="text-sm text-[var(--muted)]">Completed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--warning)]">
                      {hours(remainingMinutes!)}
                    </p>
                    <p className="text-sm text-[var(--muted)]">Remaining</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm font-semibold text-[var(--muted)]">
                Current deadline
              </p>
              <p className="mt-2 text-2xl font-bold text-[var(--navy)]">
                {new Intl.DateTimeFormat(undefined, {
                  timeZone: period.semester.timezone,
                  dateStyle: "medium",
                }).format(new Date(period.currentWeek.deadlineAt))}
              </p>
              <p className="mt-1 text-[var(--muted)]">
                {new Intl.DateTimeFormat(undefined, {
                  timeZone: period.semester.timezone,
                  timeStyle: "short",
                }).format(new Date(period.currentWeek.deadlineAt))}{" "}
                · {period.semester.timezone}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

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
