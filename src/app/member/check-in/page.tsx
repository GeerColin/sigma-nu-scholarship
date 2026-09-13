import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  WeeklyCheckInForm,
  type CheckInCourse,
} from "@/features/grades/weekly-check-in-form";
import { getActiveAcademicPeriod } from "@/lib/academic/calendar";
import { requireApprovedMemberContext } from "@/lib/auth/guards";
import { submissionStatusLabel } from "@/lib/domain/submissions";
import { createClient } from "@/lib/supabase/server";

function formatDeadline(value: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const params = await searchParams;
  const context = await requireApprovedMemberContext();
  const period = await getActiveAcademicPeriod(context.chapterId!);
  const supabase = await createClient();
  let courses: CheckInCourse[] = [];
  let currentSubmission: {
    original_timing: "on_time" | "late";
    revision_timing: "on_time" | "late";
    revision_number: number;
    original_submitted_at: string;
    estimated_gpa_snapshot: number | string | null;
    included_course_count: number;
    active_course_count: number;
  } | null = null;

  if (period?.currentWeek) {
    const { data: previousWeek } = await supabase
      .from("academic_weeks")
      .select("id")
      .eq("semester_id", period.semester.id)
      .lt("sequence_number", period.currentWeek.sequenceNumber)
      .order("sequence_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const [
      { data: courseRows, error: courseError },
      { data: current, error: currentError },
      { data: previous, error: previousError },
    ] = await Promise.all([
      supabase
        .from("courses")
        .select("id, name, grading_type")
        .eq("member_id", context.memberId!)
        .eq("semester_id", period.semester.id)
        .is("archived_at", null)
        .order("created_at"),
      supabase
        .from("grade_submissions")
        .select(
          "original_timing, revision_timing, revision_number, original_submitted_at, estimated_gpa_snapshot, included_course_count, active_course_count, grade_entries(course_id, reported_value)",
        )
        .eq("member_id", context.memberId!)
        .eq("week_id", period.currentWeek.id)
        .eq("is_current", true)
        .maybeSingle(),
      previousWeek
        ? supabase
            .from("grade_submissions")
            .select("grade_entries(course_id, reported_value)")
            .eq("member_id", context.memberId!)
            .eq("week_id", previousWeek.id)
            .eq("is_current", true)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (courseError || currentError || previousError) {
      throw new Error("Could not load the weekly check-in.");
    }

    currentSubmission = current
      ? {
          original_timing: current.original_timing,
          revision_timing: current.revision_timing,
          revision_number: current.revision_number,
          original_submitted_at: current.original_submitted_at,
          estimated_gpa_snapshot: current.estimated_gpa_snapshot,
          included_course_count: current.included_course_count,
          active_course_count: current.active_course_count,
        }
      : null;
    const sourceEntries = (current?.grade_entries ??
      previous?.grade_entries ??
      []) as Array<{ course_id: string; reported_value: string | number }>;
    const priorValues = new Map(
      sourceEntries.map((entry) => [entry.course_id, entry.reported_value]),
    );
    courses = (courseRows ?? []).map((course) => ({
      id: course.id,
      name: course.name,
      gradingType: course.grading_type,
      previousValue: priorValues.get(course.id) ?? null,
    })) as CheckInCourse[];
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl p-4 sm:p-7">
      <header className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-bold text-[var(--navy)]">Weekly Check-In</p>
            <p className="text-sm text-[var(--muted)]">
              {period
                ? [period.semester.name, period.currentWeek?.label]
                    .filter(Boolean)
                    .join(" · ")
                : "No active semester"}
            </p>
          </div>
        </div>
        <Link
          href="/member"
          className="font-semibold text-[var(--navy)] hover:underline"
        >
          Home
        </Link>
      </header>

      {params.status && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-[var(--success-soft)] p-4 font-semibold text-[var(--success)]"
        >
          Your weekly check-in was recorded. Revisions never overwrite prior
          submissions or their original timing.
        </p>
      )}
      {params.error && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-[var(--danger-soft)] p-4 font-semibold text-[var(--danger)]"
        >
          We couldn’t submit your grades. Nothing was recorded. Check every
          active course and try again.
        </p>
      )}

      {!period || !period.currentWeek ? (
        <Card>
          <CardContent>
            <h1 className="text-2xl font-bold text-[var(--navy)]">
              No current academic week
            </h1>
            <p className="mt-2 text-[var(--muted)]">
              The Scholarship Chair or an Admin must configure an active
              semester covering today before weekly check-ins can be submitted.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-7">
            <p className="text-sm font-semibold text-[var(--muted)]">
              Deadline:{" "}
              {formatDeadline(
                period.currentWeek.deadlineAt,
                period.semester.timezone,
              )}
            </p>
            <h1 className="mt-1 text-4xl font-bold text-[var(--navy)]">
              Report this week’s grades
            </h1>
            <p className="mt-2 text-[var(--muted)]">
              Values are prefilled from the current revision or previous week.
              Change only what is different.
            </p>
          </div>

          {currentSubmission && (
            <Card className="mb-5">
              <CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[var(--navy)]">
                      Current submission
                    </p>
                    <Badge
                      tone={
                        currentSubmission.original_timing === "on_time"
                          ? "success"
                          : "warning"
                      }
                    >
                      {submissionStatusLabel(
                        currentSubmission.original_timing,
                        currentSubmission.revision_timing,
                        currentSubmission.revision_number,
                      )}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Originally submitted{" "}
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(
                      new Date(currentSubmission.original_submitted_at),
                    )}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm font-semibold text-[var(--muted)]">
                    Estimated {period.semester.name} GPA
                  </p>
                  <p className="text-3xl font-bold text-[var(--navy)]">
                    {currentSubmission.estimated_gpa_snapshot === null
                      ? "—"
                      : Number(
                          currentSubmission.estimated_gpa_snapshot,
                        ).toFixed(2)}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {currentSubmission.included_course_count} of{" "}
                    {currentSubmission.active_course_count} courses included
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {courses.length ? (
            <WeeklyCheckInForm
              weekId={period.currentWeek.id}
              courses={courses}
              isRevision={Boolean(currentSubmission)}
            />
          ) : (
            <Card>
              <CardContent>
                <p className="font-bold text-[var(--navy)]">
                  No active courses
                </p>
                <p className="mt-2 text-[var(--muted)]">
                  Add your courses before submitting a weekly check-in.
                </p>
                <Link
                  href="/member/courses"
                  className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--navy)] px-4 font-semibold text-white"
                >
                  Set up courses
                </Link>
              </CardContent>
            </Card>
          )}

          <p className="mt-5 text-sm text-[var(--muted)]">
            Estimated {period.semester.name} GPA is calculated from the grades
            you report and the configured course weights. It may differ from
            your official university GPA.
          </p>
        </>
      )}
    </main>
  );
}
