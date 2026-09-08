import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import {
  AnalyticsCharts,
  type AnalyticsPoint,
} from "@/features/analytics/analytics-charts";
import { getActiveAcademicPeriod } from "@/lib/academic/calendar";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const context = await requireChairContext();
  const period = await getActiveAcademicPeriod(context.chapterId!);
  const supabase = await createClient();
  let data: AnalyticsPoint[] = [];

  if (period) {
    const [
      { data: weeks, error: weeksError },
      { data: submissions, error: submissionsError },
      { count: activeMemberCount, error: memberError },
    ] = await Promise.all([
      supabase
        .from("academic_weeks")
        .select("id, label, sequence_number")
        .eq("semester_id", period.semester.id)
        .order("sequence_number"),
      supabase
        .from("grade_submissions")
        .select("week_id, original_timing, estimated_gpa_snapshot")
        .eq("chapter_id", context.chapterId!)
        .eq("is_current", true),
      supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("chapter_id", context.chapterId!)
        .eq("status", "active"),
    ]);
    if (weeksError || submissionsError || memberError) {
      throw new Error("Could not load chapter analytics.");
    }
    const denominator = activeMemberCount ?? 0;
    data = (weeks ?? []).map((week) => {
      const rows = (submissions ?? []).filter(
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
  }

  return (
    <ChairAppShell>
      <PageHeading
        eyebrow={period?.semester.name ?? "Academic calendar"}
        title="Academic trends"
        description="Chapter-level submission and estimated-GPA trends calculated from current database records."
      />
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
    </ChairAppShell>
  );
}
