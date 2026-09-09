import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getActiveAcademicPeriod } from "@/lib/academic/calendar";
import { requireApprovedMemberContext } from "@/lib/auth/guards";
import { submissionStatusLabel } from "@/lib/domain/submissions";
import { createClient } from "@/lib/supabase/server";

export default async function MemberSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!["study-hours", "history"].includes(section)) notFound();
  const context = await requireApprovedMemberContext();
  const period = await getActiveAcademicPeriod(context.chapterId!);
  const supabase = await createClient();

  const { data: submissions, error: submissionError } = period
    ? await supabase
        .from("grade_submissions")
        .select(
          "id, week_id, revision_number, original_submitted_at, original_timing, revision_timing, estimated_gpa_snapshot, included_course_count, active_course_count, academic_weeks(label, sequence_number)",
        )
        .eq("member_id", context.memberId!)
        .eq("is_current", true)
        .order("original_submitted_at", { ascending: false })
    : { data: [], error: null };
  const { data: assignments, error: assignmentError } = period?.currentWeek
    ? await supabase
        .from("study_hour_assignments")
        .select("final_hours, override_hours, override_reason, state")
        .eq("member_id", context.memberId!)
        .eq("week_id", period.currentWeek.id)
        .maybeSingle()
    : { data: null, error: null };
  const { data: sessions, error: sessionError } = period?.currentWeek
    ? await supabase
        .from("study_sessions")
        .select("id, session_date, duration_minutes, notes")
        .eq("member_id", context.memberId!)
        .eq("week_id", period.currentWeek.id)
        .is("voided_at", null)
        .order("session_date", { ascending: false })
    : { data: [], error: null };
  if (submissionError || assignmentError || sessionError) {
    throw new Error("Could not load your academic history.");
  }
  const completedMinutes = (sessions ?? []).reduce(
    (total, session) => total + session.duration_minutes,
    0,
  );

  return (
    <main className="mx-auto min-h-screen max-w-4xl p-4 sm:p-7">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-bold text-[var(--navy)]">
              {section === "study-hours"
                ? "My Study Hours"
                : "My History / Trends"}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {period?.semester.name ?? "No active semester"}
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

      {section === "study-hours" ? (
        <>
          <h1 className="text-4xl font-bold text-[var(--navy)]">
            My study hours
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            Your current requirement and proctor-recorded sessions.
          </p>
          <Card className="mt-7">
            <CardContent>
              {assignments ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--muted)]">
                      Required
                    </p>
                    <p className="mt-1 text-3xl font-bold text-[var(--navy)]">
                      {assignments.final_hours} hr
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--muted)]">
                      Completed
                    </p>
                    <p className="mt-1 text-3xl font-bold text-[var(--navy)]">
                      {completedMinutes / 60} hr
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--muted)]">
                      Remaining
                    </p>
                    <p className="mt-1 text-3xl font-bold text-[var(--navy)]">
                      {Math.max(
                        Number(assignments.final_hours) - completedMinutes / 60,
                        0,
                      )}{" "}
                      hr
                    </p>
                  </div>
                  {assignments.override_hours !== null && (
                    <p className="text-sm text-[var(--muted)] sm:col-span-3">
                      Your requirement was overridden:{" "}
                      {assignments.override_reason}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[var(--muted)]">
                  No study-hour assignment yet.
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="mt-5">
            <CardHeader>
              <h2 className="text-xl font-bold text-[var(--navy)]">
                Current-week sessions
              </h2>
            </CardHeader>
            <div className="divide-y">
              {(sessions ?? []).map((session) => (
                <article
                  key={session.id}
                  className="flex items-center justify-between gap-4 p-5"
                >
                  <div>
                    <p className="font-bold text-[var(--navy)]">
                      {session.session_date}
                    </p>
                    {session.notes && (
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {session.notes}
                      </p>
                    )}
                  </div>
                  <p className="font-bold text-[var(--navy)]">
                    {session.duration_minutes / 60} hr
                  </p>
                </article>
              ))}
              {!sessions?.length && (
                <p className="p-8 text-center text-[var(--muted)]">
                  No study sessions for this week.
                </p>
              )}
            </div>
          </Card>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-bold text-[var(--navy)]">
            Submission history
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            Estimated semester GPA values from your current weekly revisions.
          </p>
          <Card className="mt-7">
            <div className="divide-y">
              {(submissions ?? []).map((submission) => {
                const week = submission.academic_weeks as unknown as {
                  label: string;
                  sequence_number: number;
                } | null;
                return (
                  <article
                    key={submission.id}
                    className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-bold text-[var(--navy)]">
                        {week?.label ?? "Academic week"}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(
                          new Date(submission.original_submitted_at),
                        )}{" "}
                        · Revision {submission.revision_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        tone={
                          submission.original_timing === "on_time"
                            ? "success"
                            : "warning"
                        }
                      >
                        {submissionStatusLabel(
                          submission.original_timing,
                          submission.revision_timing,
                          submission.revision_number,
                        )}
                      </Badge>
                      <p className="mt-1 font-bold text-[var(--navy)]">
                        Estimated {period?.semester.name ?? "semester"} GPA:{" "}
                        {submission.estimated_gpa_snapshot === null
                          ? "—"
                          : Number(submission.estimated_gpa_snapshot).toFixed(
                              2,
                            )}
                      </p>
                    </div>
                  </article>
                );
              })}
              {!submissions?.length && (
                <p className="p-8 text-center text-[var(--muted)]">
                  No weekly submissions for this semester.
                </p>
              )}
            </div>
          </Card>
          <p className="mt-4 text-sm text-[var(--muted)]">
            Estimated GPA is based on member-reported grades and configured
            course weights. It may differ from your official university GPA.
          </p>
        </>
      )}
    </main>
  );
}
