import Link from "next/link";
import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import { PrivacySensitiveBlock } from "@/components/presentation-privacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getWeeklyReview } from "@/features/weekly-review/queries";
import {
  hourFilters,
  submissionFilters,
  weeklyReviewHref,
} from "@/features/weekly-review/validation";
import { formatDateTimeInTimeZone } from "@/lib/domain/dates";

const submissionLabels = {
  all: "All submissions",
  on_time: "On Time",
  late: "Late",
  awaiting: "Awaiting submission",
  missing: "Missing",
  not_required: "No grade check required",
  eligibility_unknown: "Eligibility unknown",
} as const;
const hourLabels = {
  all: "All hour statuses",
  incomplete: "Incomplete hours",
  complete: "Complete",
  not_required: "Not required",
  not_assigned: "Not assigned",
} as const;
const linkClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl border bg-white px-4 py-2 font-semibold text-[var(--navy)] hover:bg-[var(--surface-subtle)]";

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${new Intl.NumberFormat("en-US").format(hours)} hr${remainder ? ` ${remainder} min` : ""}`;
}

function formatDate(value: string) {
  // Calendar dates are not instants: UTC keeps date-only values from rolling back.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

export default async function ThisWeekPage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string | string[];
    status?: string | string[];
    hours?: string | string[];
  }>;
}) {
  const { members, period, weeks, selectedWeek, query, historical, problem } =
    await getWeeklyReview(await searchParams);
  const currentWeek = period?.currentWeek;
  const index = weeks.findIndex((week) => week.id === selectedWeek?.id);
  const previous = index > 0 ? weeks[index - 1] : null;
  const next = index >= 0 ? weeks[index + 1] : null;
  const lastWeek = currentWeek
    ? weeks.find(
        (week) => week.sequenceNumber === currentWeek.sequenceNumber - 1,
      )
    : null;
  const href = (week: number) => weeklyReviewHref({ ...query, week });
  const matchingSubmission = members.filter(
    (member) =>
      query.status === "all" || member.submissionStatus === query.status,
  );
  const matchingHours = members.filter(
    (member) => query.hours === "all" || member.status === query.hours,
  );
  const shown = matchingSubmission.filter(
    (member) => query.hours === "all" || member.status === query.hours,
  );
  const awaitingCount = members.filter(
    (member) => member.submissionStatus === "awaiting",
  ).length;
  const unknownCount = members.filter(
    (member) => member.submissionStatus === "eligibility_unknown",
  ).length;

  return (
    <ChairAppShell>
      <PageHeading
        eyebrow={period?.semester.name ?? "Academic calendar"}
        title="Weekly check-ins"
        description="Review weekly submissions and study-hour completion for the currently active roster."
      />
      {problem || !selectedWeek || !period ? (
        <Card>
          <CardContent>
            <h2 className="font-bold text-[var(--navy)]">
              Weekly view unavailable
            </h2>
            <p role="status" className="mt-2 text-[var(--muted)]">
              {problem}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/this-week" className={linkClass}>
                Current week
              </Link>
              <Link href="/settings" className={linkClass}>
                Set up semester
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-5">
            <CardContent>
              <h2 className="text-xl font-bold text-[var(--navy)]">
                {historical ? "Viewing historical" : "Current"} Week{" "}
                {selectedWeek.sequenceNumber}: {selectedWeek.label}
              </h2>
              <p className="mt-1 font-semibold">
                {formatDate(selectedWeek.startsOn)} –{" "}
                {formatDate(selectedWeek.endsOn)} · {period.semester.timezone}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Study hours use this academic week’s ending date, not its
                grade-check deadline.
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {selectedWeek.gradeCheckRequired
                  ? `Grade-check deadline: ${formatDateTimeInTimeZone(selectedWeek.deadlineAt, period.semester.timezone)}`
                  : selectedWeek.sequenceNumber <
                      (period.semester.firstGradeCheckSequence ?? 1)
                    ? `Grade checks begin Week ${period.semester.firstGradeCheckSequence ?? "later in the semester"}.`
                    : "No grade check required this week."}
              </p>
              {!selectedWeek.gradeCheckRequired && (
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Stored study-hour requirements and sessions still apply.
                </p>
              )}
              <form
                action="/this-week"
                method="get"
                className="mt-4 flex flex-wrap items-end gap-3"
              >
                <div className="min-w-0 flex-1 sm:flex-none">
                  <label
                    htmlFor="review-week"
                    className="mb-1 block text-sm font-semibold"
                  >
                    Academic week
                  </label>
                  <select
                    key={selectedWeek.id}
                    id="review-week"
                    name="week"
                    defaultValue={String(selectedWeek.sequenceNumber)}
                    className="min-h-11 w-full max-w-full rounded-xl border bg-white px-3 text-[var(--navy)]"
                  >
                    {weeks.map((week) => (
                      <option key={week.id} value={week.sequenceNumber}>
                        Week {week.sequenceNumber} · {formatDate(week.startsOn)}{" "}
                        – {formatDate(week.endsOn)}
                      </option>
                    ))}
                  </select>
                </div>
                <input type="hidden" name="status" value={query.status} />
                <input type="hidden" name="hours" value={query.hours} />
                <Button type="submit">View week</Button>
              </form>
              <nav
                aria-label="Academic week navigation"
                className="mt-3 flex flex-wrap gap-2"
              >
                {previous ? (
                  <Link
                    href={href(previous.sequenceNumber) as never}
                    className={linkClass}
                  >
                    ← Previous week
                  </Link>
                ) : (
                  <span className="self-center px-2 text-sm text-[var(--muted)]">
                    First academic week
                  </span>
                )}
                {next && (
                  <Link
                    href={href(next.sequenceNumber) as never}
                    className={linkClass}
                  >
                    Next week →
                  </Link>
                )}
                <Link
                  href={href(currentWeek!.sequenceNumber) as never}
                  className={linkClass}
                >
                  Return to current week
                </Link>
                {lastWeek ? (
                  <Link
                    href={
                      weeklyReviewHref({
                        week: lastWeek.sequenceNumber,
                        status: "all",
                        hours: "incomplete",
                      }) as never
                    }
                    className={linkClass}
                  >
                    Last week → Incomplete hours
                  </Link>
                ) : (
                  <span className="self-center px-2 text-sm text-[var(--muted)]">
                    No previous academic week is available.
                  </span>
                )}
              </nav>
              {historical && (
                <p className="mt-4 text-sm text-[var(--muted)]">
                  Historical results reflect the currently active roster and
                  include subsequent corrections. This is not an end-of-week
                  roster or snapshot. Historical browsing is read-only.
                </p>
              )}
            </CardContent>
          </Card>

          <PrivacySensitiveBlock>
            {historical && (
              <p className="mb-5 rounded-xl border bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">
                Historical eligibility is not fully recorded. Existing
                submissions retain their recorded timing; active members without
                a submission are “Eligibility unknown,” not confirmed missing.
                Study-hour status uses stored assignments regardless.
              </p>
            )}
            <section
              aria-label="Selected-week totals"
              className="mb-5 grid gap-4 lg:grid-cols-2"
            >
              <Card>
                <CardContent>
                  <h2 className="font-bold text-[var(--navy)]">
                    Submission totals
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Selected week · all {members.length} currently active
                    members · before filters
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {submissionFilters
                      .filter(
                        (status) =>
                          status !== "all" &&
                          (historical || status !== "eligibility_unknown"),
                      )
                      .map((status) => (
                        <div key={status}>
                          <dt className="text-sm text-[var(--muted)]">
                            {submissionLabels[status]}
                          </dt>
                          <dd className="text-2xl font-bold text-[var(--navy)] tabular-nums">
                            {
                              members.filter(
                                (member) => member.submissionStatus === status,
                              ).length
                            }
                          </dd>
                        </div>
                      ))}
                  </dl>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h2 className="font-bold text-[var(--navy)]">
                    Study-hour totals
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Selected week · currently active roster · before filters
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    {hourFilters
                      .filter((status) => status !== "all")
                      .map((status) => (
                        <div key={status}>
                          <dt className="text-sm text-[var(--muted)]">
                            {hourLabels[status]}
                          </dt>
                          <dd className="text-2xl font-bold text-[var(--navy)] tabular-nums">
                            {
                              members.filter(
                                (member) => member.status === status,
                              ).length
                            }
                          </dd>
                        </div>
                      ))}
                  </dl>
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardContent>
                <nav
                  aria-label="Submission status filters"
                  className="mb-3 flex flex-wrap gap-2"
                >
                  {submissionFilters
                    .filter(
                      (status) =>
                        historical || status !== "eligibility_unknown",
                    )
                    .map((status) => (
                      <Link
                        key={status}
                        href={
                          weeklyReviewHref({
                            ...query,
                            week: selectedWeek.sequenceNumber,
                            status,
                          }) as never
                        }
                        aria-current={
                          query.status === status ? "true" : undefined
                        }
                        className={`${linkClass} ${query.status === status ? "border-[var(--navy)] bg-[var(--surface-subtle)] ring-1 ring-[var(--navy)]" : ""}`}
                      >
                        {submissionLabels[status]} (
                        {status === "all"
                          ? matchingHours.length
                          : matchingHours.filter(
                              (member) => member.submissionStatus === status,
                            ).length}
                        )
                      </Link>
                    ))}
                </nav>
                <nav
                  aria-label="Study-hour filters"
                  className="mb-4 flex flex-wrap gap-2"
                >
                  {hourFilters.map((hours) => (
                    <Link
                      key={hours}
                      href={
                        weeklyReviewHref({
                          ...query,
                          week: selectedWeek.sequenceNumber,
                          hours,
                        }) as never
                      }
                      aria-current={query.hours === hours ? "true" : undefined}
                      className={`${linkClass} ${query.hours === hours ? "border-[var(--navy)] bg-[var(--surface-subtle)] ring-1 ring-[var(--navy)]" : ""}`}
                    >
                      {hourLabels[hours]} (
                      {hours === "all"
                        ? matchingSubmission.length
                        : matchingSubmission.filter(
                            (member) => member.status === hours,
                          ).length}
                      )
                    </Link>
                  ))}
                </nav>
                <p role="status" className="mb-3 text-sm text-[var(--muted)]">
                  Showing {shown.length} of {members.length} currently active
                  members. Submission: {submissionLabels[query.status]}. Study
                  hours: {hourLabels[query.hours]}. Filters combine; each filter
                  count includes the other selected filter.
                </p>
                <div className="divide-y">
                  {shown.map((member) => (
                    <article
                      key={member.id}
                      className="flex min-w-0 flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 break-words">
                        <h3 className="font-bold text-[var(--navy)]">
                          {member.name}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {member.submittedAt
                            ? `Original submission: ${formatDateTimeInTimeZone(member.submittedAt, period.semester.timezone)}`
                            : "Not submitted"}
                        </p>
                        <p className="mt-1 font-semibold tabular-nums">
                          {formatMinutes(member.completedMinutes)} /{" "}
                          {member.requiredMinutes === null
                            ? "Not assigned"
                            : formatMinutes(member.requiredMinutes)}
                        </p>
                        {member.shortfallMinutes !== null && (
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            {member.shortfallMinutes > 0
                              ? `Short by ${member.shortfallMinutes} min`
                              : "0 min short"}
                          </p>
                        )}
                        {member.activityAfterWeek && (
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            Records entered or updated after this week ended.
                            This does not identify which totals changed.
                          </p>
                        )}
                        <Link
                          href={`/members/${member.id}` as never}
                          className="mt-2 inline-flex min-h-11 items-center font-semibold text-[var(--navy)] hover:underline"
                        >
                          Member profile (current week)
                          <span className="sr-only">: {member.name}</span>
                        </Link>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-56 sm:justify-end">
                        <Badge
                          tone={
                            member.status === "incomplete"
                              ? "danger"
                              : member.status === "complete"
                                ? "success"
                                : "neutral"
                          }
                        >
                          {hourLabels[member.status]}
                        </Badge>
                        <Badge
                          tone={
                            member.submissionStatus === "missing"
                              ? "danger"
                              : member.submissionStatus === "late"
                                ? "warning"
                                : member.submissionStatus === "on_time"
                                  ? "success"
                                  : "neutral"
                          }
                        >
                          {submissionLabels[member.submissionStatus]}
                        </Badge>
                      </div>
                    </article>
                  ))}
                  {!shown.length && (
                    <p className="py-8 text-center text-[var(--muted)]">
                      {query.status === "missing" && query.hours === "all"
                        ? !selectedWeek.gradeCheckRequired
                          ? "No grade check is required this week."
                          : historical && unknownCount
                            ? `No missing check-ins can be confirmed. Historical eligibility is unknown for ${unknownCount} active ${unknownCount === 1 ? "member" : "members"}.`
                            : awaitingCount > 0
                              ? `No missing check-ins. ${awaitingCount} ${awaitingCount === 1 ? "member is" : "members are"} still awaiting submission.`
                              : "No missing check-ins this week."
                        : "No currently active members match both filters for this week."}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </PrivacySensitiveBlock>
        </>
      )}
    </ChairAppShell>
  );
}
