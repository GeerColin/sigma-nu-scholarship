import Link from "next/link";
import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import {
  PrivacyActionGuard,
  PrivacySensitive,
} from "@/components/presentation-privacy";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getMemberDirectory } from "@/features/members/queries";

const statuses = [
  "all",
  "on_time",
  "late",
  "awaiting",
  "missing",
  "not_required",
] as const;
type StatusFilter = (typeof statuses)[number];

const labels = {
  on_time: "On Time",
  late: "Late",
  awaiting: "Awaiting submission",
  missing: "Missing",
  not_required: "No grade check required",
  not_configured: "Not configured",
} as const;

export default async function ThisWeekPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const query = await searchParams;
  const selectedStatus = statuses.includes(query.status as StatusFilter)
    ? (query.status as StatusFilter)
    : "all";
  const { members, period } = await getMemberDirectory({ filter: "active" });
  const counts = {
    on_time: members.filter((member) => member.submissionStatus === "on_time")
      .length,
    late: members.filter((member) => member.submissionStatus === "late").length,
    awaiting: members.filter((member) => member.submissionStatus === "awaiting")
      .length,
    missing: members.filter((member) => member.submissionStatus === "missing")
      .length,
    not_required: members.filter(
      (member) => member.submissionStatus === "not_required",
    ).length,
  };
  const shown =
    selectedStatus === "all"
      ? members
      : members.filter((member) => member.submissionStatus === selectedStatus);

  return (
    <ChairAppShell>
      <PageHeading
        eyebrow={
          period
            ? [period.semester.name, period.currentWeek?.label]
                .filter(Boolean)
                .join(" · ")
            : "Academic calendar"
        }
        title="Weekly check-ins"
        description={
          period?.currentWeek
            ? period.currentWeek.gradeCheckRequired
              ? "Deadline: " +
                new Intl.DateTimeFormat(undefined, {
                  timeZone: period.semester.timezone,
                  dateStyle: "full",
                  timeStyle: "short",
                }).format(new Date(period.currentWeek.deadlineAt)) +
                " · " +
                period.semester.timezone
              : period.currentWeek.sequenceNumber <
                  (period.semester.firstGradeCheckSequence ?? 1)
                ? `Grade checks begin Week ${period.semester.firstGradeCheckSequence ?? "later in the semester"}.`
                : "No grade check required this week."
            : "No current academic week is configured."
        }
      />

      {!period?.currentWeek ? (
        <Card>
          <CardContent>
            <p className="font-bold text-[var(--navy)]">
              No current academic week
            </p>
            <p className="mt-2 text-[var(--muted)]">
              Configure an active semester covering today before reviewing
              weekly submission status.
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
        <>
          {!period.currentWeek.gradeCheckRequired && (
            <div className="mb-5 rounded-xl bg-[var(--surface-subtle)] p-4">
              <p className="font-bold text-[var(--navy)]">
                {period.currentWeek.sequenceNumber <
                (period.semester.firstGradeCheckSequence ?? 1)
                  ? `Grade checks begin Week ${period.semester.firstGradeCheckSequence}.`
                  : "No grade check required this week."}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Members may still log study time and attend scheduled proctor
                sessions.
              </p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {(
              [
                ["On Time", counts.on_time, "success"],
                ["Late", counts.late, "warning"],
                ["Awaiting submission", counts.awaiting, "neutral"],
                ["Missing", counts.missing, "danger"],
                ["No grade check", counts.not_required, "neutral"],
              ] as const
            ).map(([label, value, tone]) => (
              <Card key={label}>
                <CardContent>
                  <p className="text-sm font-semibold text-[var(--muted)]">
                    {label}
                  </p>
                  <div className="mt-2 flex items-end justify-between">
                    <p className="text-4xl font-bold text-[var(--navy)]">
                      <PrivacySensitive>{value}</PrivacySensitive>
                    </p>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-5">
            <CardContent>
              <PrivacyActionGuard label="Turn off presentation privacy to filter weekly academic status.">
                <form className="mb-5 flex flex-wrap gap-2">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      name="status"
                      value={status}
                      className={
                        "min-h-11 rounded-xl px-4 font-semibold " +
                        (selectedStatus === status
                          ? "bg-[var(--navy)] text-white"
                          : "border bg-white text-[var(--navy)]")
                      }
                    >
                      {status === "all"
                        ? `All (${members.length})`
                        : `${labels[status as keyof typeof labels]} (${counts[status as keyof typeof counts]})`}
                    </button>
                  ))}
                </form>
              </PrivacyActionGuard>
              <div className="divide-y">
                {shown.map((member) => (
                  <article
                    key={member.id}
                    className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <Link
                        href={("/members/" + member.id) as never}
                        className="font-bold text-[var(--navy)] hover:underline"
                      >
                        {member.name}
                      </Link>
                      <PrivacySensitive className="mt-1 text-sm text-[var(--muted)]">
                        {member.submittedAt
                          ? new Intl.DateTimeFormat(undefined, {
                              timeZone: period.semester.timezone,
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(member.submittedAt))
                          : "Not submitted"}
                      </PrivacySensitive>
                    </div>
                    <PrivacySensitive>
                      <Badge
                        tone={
                          member.submissionStatus === "on_time"
                            ? "success"
                            : member.submissionStatus === "late"
                              ? "warning"
                              : member.submissionStatus === "missing"
                                ? "danger"
                                : "neutral"
                        }
                      >
                        {labels[member.submissionStatus]}
                      </Badge>
                    </PrivacySensitive>
                  </article>
                ))}
                {!shown.length && (
                  <p className="py-8 text-center text-[var(--muted)]">
                    {selectedStatus === "missing"
                      ? "Everyone has submitted a check-in this week."
                      : "No active members match this status."}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </ChairAppShell>
  );
}
