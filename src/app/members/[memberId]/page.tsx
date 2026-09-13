import Link from "next/link";
import { notFound } from "next/navigation";
import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  acknowledgeAcademicAlert,
  reviewCustomGrading,
} from "@/features/academics/actions";
import { getMemberDetail } from "@/features/members/queries";
import { submissionStatusLabel } from "@/lib/domain/submissions";

function formatGrade(value: unknown) {
  if (value === null || value === undefined) return "No grade reported";
  if (typeof value === "number") return `${value}%`;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function formatHours(minutes: number) {
  return (minutes / 60).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const gradingLabels: Record<string, string> = {
  percentage: "Percentage",
  letter: "Letter Grade",
  pass_fail: "Pass / Fail",
  custom: "Custom / Other",
};

export default async function MemberProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { memberId } = await params;
  const query = await searchParams;
  const result = await getMemberDetail(memberId);
  if (!result) notFound();
  const { member, period } = result;
  const latestSubmission =
    member.submissions.find((submission) => submission.isCurrent) ?? null;
  const gpaTitle = period
    ? `Estimated ${period.semester.name} GPA`
    : "Estimated semester GPA";

  return (
    <ChairAppShell>
      <PageHeading
        eyebrow="Member profile"
        title={member.name}
        description={`${member.status[0]?.toUpperCase()}${member.status.slice(1)} member · ${member.connectedEmail ? "Google account connected" : "No Google account connected"}`}
        action={
          <Link
            href="/members"
            className="font-semibold text-[var(--navy)] hover:underline"
          >
            Back to members
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {member.roles.map((role) => (
          <Badge key={role}>{role.replaceAll("_", " ")}</Badge>
        ))}
        {member.connectedEmail && (
          <Badge tone="success">{member.connectedEmail}</Badge>
        )}
        {member.notificationEmail && (
          <Badge tone="neutral">Notices: {member.notificationEmail}</Badge>
        )}
      </div>

      <nav
        aria-label="Member profile sections"
        className="mb-5 flex flex-wrap gap-2"
      >
        {[
          ["Overview", "#overview"],
          ["Courses", "#courses"],
          ["Grade history", "#grade-history"],
          ["Study hours", "#study-sessions"],
          ["Alerts", "#alerts"],
        ].map(([label, href]) => (
          <a
            key={href}
            href={href}
            className="inline-flex min-h-11 shrink-0 items-center rounded-xl border bg-white px-4 font-semibold text-[var(--navy)]"
          >
            {label}
          </a>
        ))}
      </nav>

      {query.status && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-[var(--success-soft)] p-4 font-semibold text-[var(--success)]"
        >
          {query.status === "custom-reviewed"
            ? "The Custom/Other grading decision was saved and audited."
            : "The academic alert was acknowledged and audited."}
        </p>
      )}
      {query.error && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-[var(--danger-soft)] p-4 font-semibold text-[var(--danger)]"
        >
          We couldn’t save that academic review. Nothing was changed.
        </p>
      )}

      <div id="overview" className="grid scroll-mt-4 gap-5 lg:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm font-semibold text-[var(--muted)]">
              {gpaTitle}
            </p>
            <p className="mt-2 text-4xl font-bold text-[var(--navy)]">
              {latestSubmission?.estimatedGpa?.toFixed(2) ?? "—"}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {latestSubmission
                ? `Based on ${latestSubmission.includedCourseCount} of ${latestSubmission.activeCourseCount} active courses.`
                : "No grade submission is available for this semester."}{" "}
              This estimate may differ from the official university GPA.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm font-semibold text-[var(--muted)]">
              Current-week study hours
            </p>
            {member.studyHours ? (
              <>
                <p className="mt-2 text-4xl font-bold text-[var(--navy)]">
                  {formatHours(member.studyHours.completedMinutes)}{" "}
                  <span className="text-xl text-[var(--muted)]">
                    of {formatHours(member.studyHours.requiredMinutes)}
                  </span>
                </p>
                <Badge
                  tone={
                    member.studyHours.remainingMinutes === 0
                      ? "success"
                      : "warning"
                  }
                  className="mt-3"
                >
                  {member.studyHours.remainingMinutes === 0
                    ? "Complete"
                    : `${formatHours(member.studyHours.remainingMinutes)} ${member.studyHours.remainingMinutes === 60 ? "hour" : "hours"} remaining`}
                </Badge>
                {member.studyHours.overridden && (
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Overridden: {member.studyHours.overrideReason}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-[var(--muted)]">
                No study-hour assignment yet.
              </p>
            )}
            {member.studyHours && (
              <Link
                href={`/study-hours?member=${member.id}`}
                className="mt-4 inline-flex min-h-11 items-center rounded-xl border px-3 font-semibold text-[var(--navy)]"
              >
                Manage requirement (Chair/Admin)
              </Link>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm font-semibold text-[var(--muted)]">
              Academic alerts
            </p>
            <p className="mt-2 text-4xl font-bold text-[var(--navy)]">
              {member.alerts.filter((alert) => !alert.acknowledgedAt).length}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {member.alerts.length
                ? `${member.alerts.length} total alert records.`
                : "No academic alerts."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card id="courses" className="mt-5 scroll-mt-4">
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Current courses
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {member.courses.map((course) => (
              <div key={course.id} className="rounded-xl border p-4">
                <div className="flex justify-between gap-3">
                  <p className="font-bold text-[var(--navy)]">{course.name}</p>
                  <p className="font-bold">{formatGrade(course.latestValue)}</p>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {course.creditHours} credit
                  {course.creditHours === 1 ? "" : "s"} ·{" "}
                  {gradingLabels[course.gradingType] ?? course.gradingType}
                  {course.archived ? " · Archived" : ""}
                </p>
                {course.gradingType === "custom" && (
                  <div className="mt-3 border-t pt-3">
                    <p className="text-sm text-[var(--muted)]">
                      {course.customDescription ??
                        "Member-provided Custom/Other standing"}
                    </p>
                    {course.customReview ? (
                      <p className="mt-2 text-sm font-semibold text-[var(--success)]">
                        Reviewed as{" "}
                        {course.customReview.treatment.replaceAll("_", " ")}:{" "}
                        {course.customReview.reason}
                      </p>
                    ) : (
                      <Badge tone="warning" className="mt-2">
                        Review required
                      </Badge>
                    )}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-semibold text-[var(--navy)]">
                        {course.customReview
                          ? "Revise decision"
                          : "Review course"}
                      </summary>
                      <form
                        action={reviewCustomGrading}
                        className="mt-3 space-y-3"
                      >
                        <input
                          type="hidden"
                          name="courseId"
                          value={course.id}
                        />
                        <input
                          type="hidden"
                          name="memberId"
                          value={member.id}
                        />
                        <label className="block">
                          <span className="mb-1 block text-sm font-semibold">
                            Approved handling
                          </span>
                          <select
                            name="treatment"
                            defaultValue={
                              course.customReview?.treatment === "pass_fail"
                                ? "pass_fail"
                                : "exclude"
                            }
                            className="min-h-11 w-full rounded-xl border bg-white px-3"
                          >
                            <option value="exclude">
                              Exclude from estimated GPA
                            </option>
                            <option value="pass_fail">
                              Treat as Pass / Fail
                            </option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-sm font-semibold">
                            Decision reason
                          </span>
                          <input
                            name="reason"
                            required
                            minLength={2}
                            maxLength={500}
                            className="min-h-11 w-full rounded-xl border px-3"
                          />
                        </label>
                        <Button type="submit">Save reviewed handling</Button>
                      </form>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
          {!member.courses.length && (
            <p className="py-5 text-center text-[var(--muted)]">
              No active courses.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card id="grade-history" className="scroll-mt-4">
          <CardHeader>
            <h2 className="text-xl font-bold text-[var(--navy)]">
              Submission history and Estimated GPA trend
            </h2>
          </CardHeader>
          <div className="divide-y">
            {member.submissions.map((submission) => (
              <article key={submission.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-[var(--navy)]">
                      {submission.weekLabel}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {formatDateTime(submission.originalSubmittedAt)} ·
                      Revision {submission.revision}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      tone={
                        submission.timing === "on_time" ? "success" : "warning"
                      }
                    >
                      {submissionStatusLabel(
                        submission.timing,
                        submission.revisionTiming,
                        submission.revision,
                      )}
                    </Badge>
                    {!submission.isCurrent && (
                      <Badge className="ml-2">Prior revision</Badge>
                    )}
                    <p className="mt-1 font-bold text-[var(--navy)]">
                      GPA {submission.estimatedGpa?.toFixed(2) ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {submission.entries.map((entry) => (
                    <p key={entry.courseId} className="text-sm">
                      <span className="font-semibold">{entry.courseName}:</span>{" "}
                      {formatGrade(entry.reportedValue)}
                    </p>
                  ))}
                </div>
              </article>
            ))}
            {!member.submissions.length && (
              <p className="p-8 text-center text-[var(--muted)]">
                No weekly submissions for this semester.
              </p>
            )}
          </div>
        </Card>

        <Card id="study-sessions" className="scroll-mt-4">
          <CardHeader>
            <h2 className="text-xl font-bold text-[var(--navy)]">
              Current-week study sessions
            </h2>
          </CardHeader>
          <div className="divide-y">
            {member.studySessions.map((session) => (
              <article
                key={session.id}
                className="flex items-center justify-between gap-4 p-5"
              >
                <div>
                  <p className="font-bold text-[var(--navy)]">{session.date}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Recorded by {session.proctorName}
                    {session.notes ? ` · ${session.notes}` : ""}
                  </p>
                </div>
                <p className="font-bold text-[var(--navy)]">
                  {formatHours(session.durationMinutes)} hr
                </p>
              </article>
            ))}
            {!member.studySessions.length && (
              <p className="p-8 text-center text-[var(--muted)]">
                No study sessions for the current week.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card id="alerts" className="mt-5 scroll-mt-4">
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Academic alert history
          </h2>
        </CardHeader>
        <div className="divide-y">
          {member.alerts.map((alert) => (
            <article key={alert.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-[var(--navy)]">
                    {alert.type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {formatDateTime(alert.createdAt)}
                  </p>
                </div>
                <Badge tone={alert.acknowledgedAt ? "neutral" : "warning"}>
                  {alert.acknowledgedAt ? "Acknowledged" : "Open"}
                </Badge>
              </div>
              {!alert.acknowledgedAt && (
                <form
                  action={acknowledgeAcademicAlert}
                  className="mt-4 flex flex-col gap-3 sm:flex-row"
                >
                  <input type="hidden" name="alertId" value={alert.id} />
                  <input type="hidden" name="memberId" value={member.id} />
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Acknowledgment note</span>
                    <input
                      name="reason"
                      required
                      minLength={2}
                      maxLength={500}
                      placeholder="Review note"
                      className="min-h-11 w-full rounded-xl border px-3"
                    />
                  </label>
                  <Button type="submit">Acknowledge alert</Button>
                </form>
              )}
            </article>
          ))}
          {!member.alerts.length && (
            <p className="p-8 text-center text-[var(--muted)]">
              No academic alerts.
            </p>
          )}
        </div>
      </Card>
    </ChairAppShell>
  );
}
