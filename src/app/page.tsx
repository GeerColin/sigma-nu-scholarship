import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { ChairAppShell } from "@/components/chair-app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getMemberDirectory } from "@/features/members/queries";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const context = await requireChairContext();
  const { members, period } = await getMemberDirectory({ filter: "active" });
  const supabase = await createClient();
  const [
    { count: openAlertCount, error: alertError },
    { data: customCourses, error: customCourseError },
    { data: customReviews, error: customReviewError },
  ] = await Promise.all([
    supabase
      .from("academic_alerts")
      .select("id", { count: "exact", head: true })
      .eq("chapter_id", context.chapterId!)
      .is("acknowledged_at", null),
    period
      ? supabase
          .from("courses")
          .select("id, member_id, name")
          .eq("chapter_id", context.chapterId!)
          .eq("semester_id", period.semester.id)
          .eq("grading_type", "custom")
          .is("archived_at", null)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("custom_grading_reviews")
      .select("course_id")
      .eq("chapter_id", context.chapterId!),
  ]);
  if (alertError || customCourseError || customReviewError) {
    throw new Error("Could not load dashboard metrics.");
  }

  const reviewedCustomCourseIds = new Set(
    (customReviews ?? []).map((review) => review.course_id),
  );
  const pendingCustomCourses = (customCourses ?? []).filter(
    (course) => !reviewedCustomCourseIds.has(course.id),
  );
  const customReviewCount = pendingCustomCourses.length;
  const nextCustomCourse = pendingCustomCourses[0];
  const frozenReviewCount = members.filter(
    (member) => member.assignmentState === "review_required",
  ).length;
  const weeklyStatus = {
    onTime: members.filter((member) => member.submissionStatus === "on_time")
      .length,
    late: members.filter((member) => member.submissionStatus === "late").length,
    missing: members.filter((member) => member.submissionStatus === "missing")
      .length,
  };
  const studyStatus = {
    complete: members.filter(
      (member) =>
        member.requiredMinutes !== null &&
        member.completedMinutes >= member.requiredMinutes,
    ).length,
    inProgress: members.filter(
      (member) =>
        member.requiredMinutes !== null &&
        member.completedMinutes > 0 &&
        member.completedMinutes < member.requiredMinutes,
    ).length,
    notStarted: members.filter(
      (member) =>
        member.requiredMinutes !== null && member.completedMinutes === 0,
    ).length,
  };
  const attention = [
    weeklyStatus.missing
      ? {
          title:
            weeklyStatus.missing +
            " weekly check-in" +
            (weeklyStatus.missing === 1 ? " is" : "s are") +
            " missing",
          detail: "Late submissions remain available.",
          action: "Review Missing Submissions",
          href: "/this-week?status=missing",
          icon: BookOpenCheck,
          tone: "danger",
        }
      : null,
    (openAlertCount ?? 0) > 0
      ? {
          title:
            openAlertCount +
            " open academic alert" +
            (openAlertCount === 1 ? "" : "s"),
          detail: "Secure academic review is required.",
          action: "Review Academic Alerts",
          href: "/members?filter=alerts",
          icon: AlertTriangle,
          tone: "warning",
        }
      : null,
    weeklyStatus.late > 0
      ? {
          title:
            weeklyStatus.late +
            " late weekly check-in" +
            (weeklyStatus.late === 1 ? "" : "s"),
          detail: "Late submissions are recorded separately from on-time work.",
          action: "Review Late Submissions",
          href: "/this-week?status=late",
          icon: Clock3,
          tone: "warning",
        }
      : null,
    customReviewCount > 0
      ? {
          title:
            customReviewCount +
            " custom grading review" +
            (customReviewCount === 1 ? "" : "s"),
          detail: `Next: ${nextCustomCourse!.name}. Choose how this course affects Estimated Semester GPA.`,
          action: "Review Custom Grading",
          href: `/members/${nextCustomCourse!.member_id}#courses`,
          icon: AlertTriangle,
          tone: "warning",
        }
      : null,
    frozenReviewCount > 0
      ? {
          title: `${frozenReviewCount} frozen study-hour assignment review${frozenReviewCount === 1 ? "" : "s"}`,
          detail:
            "A new calculation differs from an assignment already frozen for the week.",
          action: "Review Study-Hour Changes",
          href: "/study-hours?filter=review_required",
          icon: Clock3,
          tone: "danger",
        }
      : null,
  ].filter(Boolean) as Array<{
    title: string;
    detail: string;
    action: string;
    href: string;
    icon: typeof BookOpenCheck;
    tone: string;
  }>;

  return (
    <ChairAppShell>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-bold tracking-[0.16em] text-[var(--warning)] uppercase">
            Scholarship operations
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--navy)] sm:text-4xl">
            Welcome, {context.memberName}
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            {period
              ? [period.semester.name, period.currentWeek?.label]
                  .filter(Boolean)
                  .join(" · ")
              : "No active semester configured."}
          </p>
        </div>
        <Badge
          tone={period?.currentWeek ? "success" : "warning"}
          className="w-fit gap-2 py-2"
        >
          {period?.currentWeek ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Settings className="size-4" />
          )}
          {period?.currentWeek ? "Current week active" : "Setup required"}
        </Badge>
      </div>

      {!period?.currentWeek ? (
        <Card>
          <CardContent>
            <h2 className="text-xl font-bold text-[var(--navy)]">
              No active academic week
            </h2>
            <p className="mt-2 text-[var(--muted)]">
              Configure the semester and weekly deadlines before collecting
              grades or managing weekly study hours.
            </p>
            <Link
              href="/settings"
              className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--navy)] px-4 font-semibold text-white"
            >
              Set up semester
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[var(--navy)]">
                    Needs attention
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Live exceptions from the current chapter data.
                  </p>
                </div>
                <Badge tone={attention.length ? "danger" : "success"}>
                  {attention.length} item{attention.length === 1 ? "" : "s"}
                </Badge>
              </CardHeader>
              <div className="divide-y">
                {attention.map(
                  ({ title, detail, action, href, icon: Icon, tone }) => (
                    <div
                      key={title}
                      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
                    >
                      <div
                        className={
                          "grid size-11 shrink-0 place-items-center rounded-xl " +
                          (tone === "danger"
                            ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                            : tone === "warning"
                              ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                              : "bg-[var(--surface-subtle)] text-[var(--navy)]")
                        }
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
                        href={href as never}
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-2.5 font-semibold text-[var(--navy)] ring-1 ring-[var(--border)] transition hover:bg-[var(--surface-subtle)] sm:w-auto"
                      >
                        {action}
                        <ArrowRight className="ml-2 size-4" />
                      </Link>
                    </div>
                  ),
                )}
                {!attention.length && (
                  <p className="p-8 text-center text-[var(--muted)]">
                    No current items require attention.
                  </p>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold text-[var(--navy)]">
                  Study hours
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Current-week assignment status
                </p>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <dt className="text-sm text-[var(--muted)]">Complete</dt>
                    <dd className="mt-1 text-2xl font-bold text-[var(--navy)]">
                      {studyStatus.complete}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-[var(--muted)]">In progress</dt>
                    <dd className="mt-1 text-2xl font-bold text-[var(--navy)]">
                      {studyStatus.inProgress}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-[var(--muted)]">Not started</dt>
                    <dd className="mt-1 text-2xl font-bold text-[var(--navy)]">
                      {studyStatus.notStarted}
                    </dd>
                  </div>
                </dl>
                <Link
                  href="/study-hours"
                  className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl border font-semibold text-[var(--navy)]"
                >
                  Manage study hours
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="overflow-hidden border-0 bg-[var(--navy)] text-white sm:col-span-2 xl:col-span-1">
              <CardContent>
                <div className="mb-5 flex items-center justify-between">
                  <p className="font-semibold text-white/70">
                    Current deadline
                  </p>
                  <Clock3 className="size-5 text-[var(--gold)]" />
                </div>
                <p className="text-2xl font-bold">
                  {new Intl.DateTimeFormat(undefined, {
                    timeZone: period.semester.timezone,
                    dateStyle: "medium",
                  }).format(new Date(period.currentWeek.deadlineAt))}
                </p>
                <p className="mt-1 text-white/70">
                  {new Intl.DateTimeFormat(undefined, {
                    timeZone: period.semester.timezone,
                    timeStyle: "short",
                  }).format(new Date(period.currentWeek.deadlineAt))}{" "}
                  · {period.semester.timezone}
                </p>
              </CardContent>
            </Card>
            {(
              [
                ["On Time", weeklyStatus.onTime, "success"],
                ["Late", weeklyStatus.late, "warning"],
                ["Missing", weeklyStatus.missing, "danger"],
              ] as const
            ).map(([label, value, tone]) => (
              <Card key={label}>
                <CardContent>
                  <p className="text-sm font-semibold text-[var(--muted)]">
                    Weekly check-ins
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-4xl font-bold tracking-tight text-[var(--navy)]">
                      {value}
                    </p>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </ChairAppShell>
  );
}
