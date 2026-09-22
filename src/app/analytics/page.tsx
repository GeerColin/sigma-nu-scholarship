import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AnalyticsCharts,
  type AnalyticsPoint,
} from "@/features/analytics/analytics-charts";
import { getActiveAcademicPeriod } from "@/lib/academic/calendar";
import {
  gradeCheckRequiredForWeek,
  summarizeGradeCheckWeek,
} from "@/lib/domain/grade-checks";
import { dateInTimeZone } from "@/lib/domain/dates";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createReadFailure } from "@/lib/supabase/read-failure";
import { readAllPages } from "@/lib/supabase/read-all-pages";

function hours(minutes: number) {
  return (minutes / 60).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export default async function AnalyticsPage() {
  const context = await requireChairContext();
  const period = await getActiveAcademicPeriod(context.chapterId!);
  const supabase = await createClient();
  let data: AnalyticsPoint[] = [];
  let studySummary = {
    eligible: 0,
    complete: 0,
    requiredMinutes: 0,
    completedMinutes: 0,
  };
  let memberTrends: Array<{
    name: string;
    previous: number;
    current: number;
    change: number;
  }> = [];
  let courseTrends: Array<{
    name: string;
    previous: number | null;
    current: number;
    change: number | null;
  }> = [];

  if (period) {
    const currentWeekId = period.currentWeek?.id;
    const [
      { data: weeks, error: weeksError, status: weeksStatus },
      { data: submissions, error: submissionsError, status: submissionsStatus },
      { data: members, error: memberError, status: membersStatus },
      { data: entries, error: entryError, status: entriesStatus },
      { data: assignments, error: assignmentError },
      { data: sessions, error: sessionError },
    ] = await Promise.all([
      supabase
        .from("academic_weeks")
        .select(
          "id, label, sequence_number, starts_on, ends_on, deadline_at, grade_check_required",
        )
        .eq("semester_id", period.semester.id)
        .order("sequence_number"),
      readAllPages((from, to) =>
        supabase
          .from("grade_submissions")
          .select(
            "id, member_id, week_id, original_timing, estimated_gpa_snapshot, academic_weeks!inner(semester_id)",
          )
          .eq("chapter_id", context.chapterId!)
          .eq("academic_weeks.semester_id", period.semester.id)
          .eq("is_current", true)
          .order("id")
          .range(from, to),
      ),
      supabase
        .from("members")
        .select("id, full_name, status")
        .eq("chapter_id", context.chapterId!)
        .eq("status", "active"),
      readAllPages((from, to) =>
        supabase
          .from("grade_entries")
          .select(
            "submission_id, course_name_snapshot, reported_value, grading_type_snapshot, grade_submissions!inner(is_current, academic_weeks!inner(semester_id))",
          )
          .eq("chapter_id", context.chapterId!)
          .eq("grade_submissions.is_current", true)
          .eq(
            "grade_submissions.academic_weeks.semester_id",
            period.semester.id,
          )
          .order("id")
          .range(from, to),
      ),
      currentWeekId
        ? supabase
            .from("study_hour_assignments")
            .select("member_id, final_hours")
            .eq("chapter_id", context.chapterId!)
            .eq("week_id", currentWeekId)
        : Promise.resolve({ data: [], error: null }),
      currentWeekId
        ? readAllPages((from, to) =>
            supabase
              .from("study_sessions")
              .select("member_id, duration_minutes")
              .eq("chapter_id", context.chapterId!)
              .eq("week_id", currentWeekId)
              .is("voided_at", null)
              .order("id")
              .range(from, to),
          )
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (
      weeksError ||
      submissionsError ||
      memberError ||
      entryError ||
      assignmentError ||
      sessionError
    ) {
      throw createReadFailure("Could not load chapter analytics.", [
        { operation: "week", error: weeksError, status: weeksStatus },
        {
          operation: "submissions",
          error: submissionsError,
          status: submissionsStatus,
        },
        { operation: "members", error: memberError, status: membersStatus },
        { operation: "other_read", error: entryError, status: entriesStatus },
        { operation: "assignments", error: assignmentError },
        { operation: "sessions", error: sessionError },
      ]);
    }

    const now = new Date();
    const today = dateInTimeZone(now, period.semester.timezone);
    const expectedCount = members?.length ?? 0;
    const firstGradeCheckSequence = period.semester.firstGradeCheckSequence;
    const memberNames = new Map(
      (members ?? []).map((member) => [member.id, member.full_name]),
    );
    const weekSequence = new Map(
      (weeks ?? []).map((week) => [week.id, week.sequence_number]),
    );
    const weekById = new Map((weeks ?? []).map((week) => [week.id, week]));
    const eligibleWeekIds = new Set<string>();
    const submissionsByWeek = new Map<
      string,
      NonNullable<typeof submissions>
    >();
    for (const submission of submissions ?? []) {
      if (!weekById.has(submission.week_id)) continue;
      const rows = submissionsByWeek.get(submission.week_id) ?? [];
      rows.push(submission);
      submissionsByWeek.set(submission.week_id, rows);
    }
    const memberIds = new Set((members ?? []).map((member) => member.id));
    const percent = (count: number) =>
      expectedCount ? Math.round((count / expectedCount) * 100) : 0;
    data = (weeks ?? []).map((week) => {
      const beforeStart =
        firstGradeCheckSequence !== null &&
        week.sequence_number < firstGradeCheckSequence;
      const future = week.starts_on > today;
      const skipped = !week.grade_check_required;
      const required = gradeCheckRequiredForWeek({
        sequenceNumber: week.sequence_number,
        firstGradeCheckSequence,
        configuredRequired: week.grade_check_required,
      });
      const excludedReason = beforeStart
        ? "pre_start"
        : skipped
          ? "skipped"
          : future
            ? "future"
            : null;
      if (required && !future) eligibleWeekIds.add(week.id);
      const rows = (submissionsByWeek.get(week.id) ?? []).filter((row) =>
        memberIds.has(row.member_id),
      );
      const summary = summarizeGradeCheckWeek({
        activeMemberIds: [...memberIds],
        submissions: rows.map((submission) => ({
          memberId: submission.member_id,
          originalTiming: submission.original_timing,
        })),
        required,
        excludedReason,
        deadlineAt: week.deadline_at,
        now,
      });
      const gpas = eligibleWeekIds.has(week.id)
        ? rows
            .map((submission) => submission.estimated_gpa_snapshot)
            .filter((value) => value !== null)
            .map(Number)
        : [];
      return {
        week: week.label,
        onTime: percent(summary.onTimeCount),
        late: percent(summary.lateCount),
        awaiting: percent(summary.awaitingCount),
        missing: percent(summary.missingCount),
        onTimeCount: summary.onTimeCount,
        lateCount: summary.lateCount,
        awaitingCount: summary.awaitingCount,
        missingCount: summary.missingCount,
        expectedCount: summary.expectedCount,
        excludedReason,
        estimatedGpa: gpas.length
          ? Number(
              (
                gpas.reduce((total, value) => total + value, 0) / gpas.length
              ).toFixed(2),
            )
          : null,
      };
    });

    const activeSubmissions = (submissions ?? []).filter(
      (submission) =>
        eligibleWeekIds.has(submission.week_id) &&
        memberIds.has(submission.member_id),
    );
    const submissionsByMember = new Map<
      string,
      Array<{ sequence: number; gpa: number }>
    >();
    for (const submission of activeSubmissions) {
      if (submission.estimated_gpa_snapshot === null) continue;
      const rows = submissionsByMember.get(submission.member_id) ?? [];
      rows.push({
        sequence: weekSequence.get(submission.week_id) ?? 0,
        gpa: Number(submission.estimated_gpa_snapshot),
      });
      submissionsByMember.set(submission.member_id, rows);
    }
    memberTrends = [...submissionsByMember.entries()]
      .flatMap(([memberId, rows]) => {
        const sorted = rows.sort((a, b) => b.sequence - a.sequence);
        if (sorted.length < 2 || !sorted[0] || !sorted[1]) return [];
        return [
          {
            name: memberNames.get(memberId) ?? "Unknown member",
            previous: sorted[1].gpa,
            current: sorted[0].gpa,
            change: Number((sorted[0].gpa - sorted[1].gpa).toFixed(2)),
          },
        ];
      })
      .sort((a, b) => b.change - a.change);

    const submissionMeta = new Map(
      activeSubmissions.map((submission) => [
        submission.id,
        { sequence: weekSequence.get(submission.week_id) ?? 0 },
      ]),
    );
    const valuesByCourse = new Map<
      string,
      Map<number, { total: number; count: number }>
    >();
    for (const entry of entries ?? []) {
      if (entry.grading_type_snapshot !== "percentage") continue;
      const meta = submissionMeta.get(entry.submission_id);
      if (!meta || typeof entry.reported_value !== "number") continue;
      const weekly =
        valuesByCourse.get(entry.course_name_snapshot) ?? new Map();
      const bucket = weekly.get(meta.sequence) ?? { total: 0, count: 0 };
      bucket.total += entry.reported_value;
      bucket.count += 1;
      weekly.set(meta.sequence, bucket);
      valuesByCourse.set(entry.course_name_snapshot, weekly);
    }
    courseTrends = [...valuesByCourse.entries()]
      .flatMap(([name, weekly]) => {
        const ordered = [...weekly.entries()].sort((a, b) => b[0] - a[0]);
        if (!ordered[0]) return [];
        const current = ordered[0][1].total / ordered[0][1].count;
        const previous = ordered[1]
          ? ordered[1][1].total / ordered[1][1].count
          : null;
        return [
          {
            name,
            previous: previous === null ? null : Number(previous.toFixed(2)),
            current: Number(current.toFixed(2)),
            change:
              previous === null
                ? null
                : Number((current - previous).toFixed(2)),
          },
        ];
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const completedByMember = new Map<string, number>();
    for (const session of sessions ?? []) {
      completedByMember.set(
        session.member_id,
        (completedByMember.get(session.member_id) ?? 0) +
          session.duration_minutes,
      );
    }
    studySummary = (assignments ?? [])
      .filter(
        (assignment) =>
          memberIds.has(assignment.member_id) &&
          Number(assignment.final_hours) > 0,
      )
      .reduce(
        (summary, assignment) => {
          const requiredMinutes = Number(assignment.final_hours) * 60;
          const completedMinutes =
            completedByMember.get(assignment.member_id) ?? 0;
          summary.eligible += 1;
          summary.requiredMinutes += requiredMinutes;
          summary.completedMinutes += completedMinutes;
          if (completedMinutes >= requiredMinutes) summary.complete += 1;
          return summary;
        },
        { eligible: 0, complete: 0, requiredMinutes: 0, completedMinutes: 0 },
      );
  }

  const current = data.find(
    (point) => point.week === period?.currentWeek?.label,
  );
  const currentWeekLabel = period?.currentWeek?.label ?? "No displayed week";
  const gradeCheckCardUnavailable = !period
    ? "No active semester"
    : !period.currentWeek || !current
      ? "No displayed week"
      : null;
  const studyCardUnavailable = !period ? "No active semester" : null;
  const analyticsWindowMessage = !period
    ? "No active semester is configured."
    : !period.currentWeek
      ? "No current academic week is available."
      : current?.excludedReason === "pre_start"
        ? `Grade checks begin ${period.semester.firstGradeCheckSequence ? `Week ${period.semester.firstGradeCheckSequence}` : "later in the semester"}.`
        : current?.excludedReason === "skipped"
          ? "No grade check required this week."
          : current?.excludedReason === "future"
            ? "The current academic week is in the future."
            : null;
  const studyEmpty = studySummary.eligible === 0;
  const onTimeCard =
    gradeCheckCardUnavailable ??
    (current?.excludedReason
      ? "Excluded"
      : `${current?.onTimeCount ?? 0} / ${current?.expectedCount ?? 0} members`);
  const lateMissingCard =
    gradeCheckCardUnavailable ??
    (current?.excludedReason
      ? "Excluded"
      : `${current?.lateCount ?? 0} late · ${current?.missingCount ?? 0} missing`);
  const studyCompletionCard =
    studyCardUnavailable ??
    (studyEmpty
      ? "No positive requirements"
      : `${studySummary.complete} / ${studySummary.eligible} members completed`);
  const studyHoursCard =
    studyCardUnavailable ??
    (studyEmpty
      ? "No positive requirements"
      : `${hours(studySummary.completedMinutes)} / ${hours(studySummary.requiredMinutes)} hr`);

  return (
    <ChairAppShell>
      <PageHeading
        eyebrow={period?.semester.name ?? "Academic calendar"}
        title="Academic trends"
        description="Submission, GPA, course, and study-hour analytics calculated from the same authoritative records used throughout the application."
      />

      {analyticsWindowMessage && (
        <div className="mb-5 rounded-xl bg-[var(--surface-subtle)] p-4">
          <p className="font-bold text-[var(--navy)]">Analytics window</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {analyticsWindowMessage} Historical records remain available, but
            excluded weeks do not count as missing submissions.
          </p>
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["On-time check-ins", onTimeCard],
          ["Late / missing this week", lateMissingCard],
          ["Study-hour completion", studyCompletionCard],
          ["Completed / required", studyHoursCard],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent>
              <p className="text-sm font-semibold text-[var(--muted)]">
                {label}
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--navy)]">
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mb-2 text-sm text-[var(--muted)]">
        Reporting week:{" "}
        <span className="font-semibold">{currentWeekLabel}</span>
        {current?.excludedReason ? " · excluded from compliance totals" : ""}
      </p>
      <p className="mb-4 text-xs text-[var(--muted)]">
        Expected grade-check counts use the active roster. The current data
        model does not store historical membership effective dates, so roster
        changes are not retroactively inferred for prior weeks.
      </p>

      <Card>
        <CardContent>
          {data.length ? (
            <AnalyticsCharts data={data} />
          ) : (
            <p className="py-8 text-center text-[var(--muted)]">
              No semester analytics are available yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-[var(--navy)]">
              Member Estimated GPA movement
            </h2>
          </CardHeader>
          <div className="divide-y">
            {memberTrends.map((trend) => (
              <div
                key={trend.name}
                className="flex items-center justify-between gap-4 p-5"
              >
                <div>
                  <p className="font-semibold text-[var(--navy)]">
                    {trend.name}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {trend.previous.toFixed(2)} to {trend.current.toFixed(2)}
                  </p>
                </div>
                <Badge
                  tone={
                    trend.change > 0
                      ? "success"
                      : trend.change < 0
                        ? "danger"
                        : "neutral"
                  }
                >
                  {trend.change > 0 ? "+" : ""}
                  {trend.change.toFixed(2)}
                </Badge>
              </div>
            ))}
            {!memberTrends.length && (
              <p className="p-8 text-center text-[var(--muted)]">
                Two submitted weeks are required for member trends.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-[var(--navy)]">
              Percentage-course movement
            </h2>
          </CardHeader>
          <div className="divide-y">
            {courseTrends.map((trend) => (
              <div
                key={trend.name}
                className="flex items-center justify-between gap-4 p-5"
              >
                <div>
                  <p className="font-semibold text-[var(--navy)]">
                    {trend.name}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    Current average {trend.current.toFixed(2)}%
                  </p>
                </div>
                <Badge
                  tone={
                    trend.change === null
                      ? "neutral"
                      : trend.change >= 0
                        ? "success"
                        : "danger"
                  }
                >
                  {trend.change === null
                    ? "First week"
                    : `${trend.change > 0 ? "+" : ""}${trend.change.toFixed(2)}`}
                </Badge>
              </div>
            ))}
            {!courseTrends.length && (
              <p className="p-8 text-center text-[var(--muted)]">
                No percentage-course submissions are available.
              </p>
            )}
          </div>
        </Card>
      </div>
    </ChairAppShell>
  );
}
