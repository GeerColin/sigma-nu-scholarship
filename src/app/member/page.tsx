import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getActiveAcademicPeriod } from "@/lib/academic/calendar";
import { requireApprovedMemberContext } from "@/lib/auth/guards";
import { submissionStatusLabel } from "@/lib/domain/submissions";
import { createClient } from "@/lib/supabase/server";
import {
  memberCheckInState,
  memberStudyHourState,
} from "@/features/members/member-dashboard-state";

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
    revision_timing: "on_time" | "late";
    revision_number: number;
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
            "original_timing, revision_timing, revision_number, original_submitted_at, estimated_gpa_snapshot, included_course_count, active_course_count",
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

  const deadline = period?.currentWeek
    ? new Date(period.currentWeek.deadlineAt)
    : null;
  const checkInState = period?.currentWeek
    ? memberCheckInState({
        submitted: Boolean(submission),
        deadlineAt: period.currentWeek.deadlineAt,
        now: new Date(),
      })
    : null;
  const checkInOverdue = checkInState === "overdue";
  const { remainingMinutes, progressPercent: studyProgress } =
    memberStudyHourState(requiredMinutes, completedMinutes);

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
          <Card
            className={
              "border-0 text-white sm:col-span-2 " +
              (checkInOverdue ? "bg-[var(--danger)]" : "bg-[var(--navy)]")
            }
          >
            <CardContent>
              <p className="text-sm font-semibold text-white/70">
                Weekly grade check-in
              </p>
              <p className="mt-1 text-sm text-white/65">
                Deadline:{" "}
                {new Intl.DateTimeFormat(undefined, {
                  timeZone: period.semester.timezone,
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(deadline!)}{" "}
                · {period.semester.timezone}
              </p>
              <div className="mt-3 flex items-center gap-2 text-2xl font-bold">
                {submission ? (
                  <CheckCircle2 className="size-6 text-[var(--gold)]" />
                ) : (
                  <Clock3 className="size-6 text-[var(--gold)]" />
                )}
                {submission
                  ? submission.original_timing === "late"
                    ? "Weekly check-in submitted late"
                    : "Weekly check-in complete"
                  : checkInOverdue
                    ? "Your check-in is overdue"
                    : "Your check-in is due"}
              </div>
              <p className="mt-2 text-sm text-white/65">
                {submission
                  ? new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(submission.original_submitted_at)) +
                    " · " +
                    submissionStatusLabel(
                      submission.original_timing,
                      submission.revision_timing,
                      submission.revision_number,
                    )
                  : checkInOverdue
                    ? "Submit now. It will be recorded as late."
                    : "Report your current standing before the deadline."}
              </p>
              <Link
                href="/member/check-in"
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-white px-5 font-bold text-[var(--navy)] sm:w-auto"
              >
                {submission
                  ? "Review or revise grades"
                  : "Submit weekly grades"}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm font-semibold text-[var(--muted)]">
                Study Hours This Week
              </p>
              {requiredMinutes === null ? (
                <p className="mt-3 text-[var(--muted)]">
                  No study-hour assignment yet.
                </p>
              ) : (
                <div className="mt-3">
                  <p className="text-xl font-bold text-[var(--navy)]">
                    {remainingMinutes === 0
                      ? "Requirement complete"
                      : `${hours(remainingMinutes!)} hours remaining`}
                  </p>
                  <div
                    className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]"
                    role="progressbar"
                    aria-label="Study-hour completion"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={studyProgress}
                  >
                    <div
                      className="h-full rounded-full bg-[var(--success)]"
                      style={{ width: `${studyProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {hours(completedMinutes)} of {hours(requiredMinutes)} hours
                    completed
                  </p>
                </div>
              )}
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
