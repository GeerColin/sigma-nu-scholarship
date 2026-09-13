import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AnalyticsCharts,
  type AnalyticsPoint,
} from "@/features/analytics/analytics-charts";
import { getActiveAcademicPeriod } from "@/lib/academic/calendar";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

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
    assigned: 0,
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
    const [
      { data: weeks, error: weeksError },
      { data: submissions, error: submissionsError },
      { data: members, error: memberError },
      { data: entries, error: entryError },
      { data: assignments, error: assignmentError },
      { data: sessions, error: sessionError },
    ] = await Promise.all([
      supabase
        .from("academic_weeks")
        .select("id, label, sequence_number")
        .eq("semester_id", period.semester.id)
        .order("sequence_number"),
      supabase
        .from("grade_submissions")
        .select(
          "id, member_id, week_id, original_timing, estimated_gpa_snapshot",
        )
        .eq("chapter_id", context.chapterId!)
        .eq("is_current", true),
      supabase
        .from("members")
        .select("id, full_name, status")
        .eq("chapter_id", context.chapterId!)
        .eq("status", "active"),
      supabase
        .from("grade_entries")
        .select(
          "submission_id, course_name_snapshot, reported_value, grading_type_snapshot",
        )
        .eq("chapter_id", context.chapterId!),
      period.currentWeek
        ? supabase
            .from("study_hour_assignments")
            .select("member_id, final_hours")
            .eq("chapter_id", context.chapterId!)
            .eq("week_id", period.currentWeek.id)
        : Promise.resolve({ data: [], error: null }),
      period.currentWeek
        ? supabase
            .from("study_sessions")
            .select("member_id, duration_minutes")
            .eq("chapter_id", context.chapterId!)
            .eq("week_id", period.currentWeek.id)
            .is("voided_at", null)
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
      throw new Error("Could not load chapter analytics.");
    }

    const weekIds = new Set((weeks ?? []).map((week) => week.id));
    const activeSubmissions = (submissions ?? []).filter((submission) =>
      weekIds.has(submission.week_id),
    );
    const denominator = members?.length ?? 0;
    data = (weeks ?? []).map((week) => {
      const rows = activeSubmissions.filter(
        (submission) => submission.week_id === week.id,
      );
      const onTimeCount = rows.filter(
        (submission) => submission.original_timing === "on_time",
      ).length;
      const lateCount = rows.filter(
        (submission) => submission.original_timing === "late",
      ).length;
      const gpas = rows
        .map((submission) => submission.estimated_gpa_snapshot)
        .filter((value) => value !== null)
        .map(Number);
      const percent = (count: number) =>
        denominator ? Math.round((count / denominator) * 100) : 0;
      return {
        week: week.label,
        onTime: percent(onTimeCount),
        late: percent(lateCount),
        missing: percent(Math.max(denominator - rows.length, 0)),
        estimatedGpa: gpas.length
          ? Number(
              (
                gpas.reduce((total, value) => total + value, 0) / gpas.length
              ).toFixed(2),
            )
          : null,
      };
    });

    const memberNames = new Map(
      (members ?? []).map((member) => [member.id, member.full_name]),
    );
    const weekSequence = new Map(
      (weeks ?? []).map((week) => [week.id, week.sequence_number]),
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
    studySummary = (assignments ?? []).reduce(
      (summary, assignment) => {
        const requiredMinutes = Number(assignment.final_hours) * 60;
        const completedMinutes =
          completedByMember.get(assignment.member_id) ?? 0;
        summary.assigned += 1;
        summary.requiredMinutes += requiredMinutes;
        summary.completedMinutes += completedMinutes;
        if (completedMinutes >= requiredMinutes) summary.complete += 1;
        return summary;
      },
      { assigned: 0, complete: 0, requiredMinutes: 0, completedMinutes: 0 },
    );
  }

  const current = data.find(
    (point) => point.week === period?.currentWeek?.label,
  );
  const completionRate = studySummary.assigned
    ? Math.round((studySummary.complete / studySummary.assigned) * 100)
    : 0;

  return (
    <ChairAppShell>
      <PageHeading
        eyebrow={period?.semester.name ?? "Academic calendar"}
        title="Academic trends"
        description="Submission, GPA, course, and study-hour analytics calculated from the same authoritative records used throughout the application."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Current on-time rate", `${current?.onTime ?? 0}%`],
          [
            "Late / missing this week",
            `${current?.late ?? 0}% / ${current?.missing ?? 0}%`,
          ],
          ["Study-hour completion", `${completionRate}%`],
          [
            "Required / completed",
            `${hours(studySummary.requiredMinutes)} / ${hours(studySummary.completedMinutes)} hr`,
          ],
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
