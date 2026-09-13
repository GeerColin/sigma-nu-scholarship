import Link from "next/link";
import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getMemberDirectory } from "@/features/members/queries";

const statuses = ["all", "on_time", "late", "missing"] as const;
type StatusFilter = (typeof statuses)[number];

const labels = {
  on_time: "On Time",
  late: "Late",
  missing: "Missing",
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
    missing: members.filter((member) => member.submissionStatus === "missing")
      .length,
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
            ? "Deadline: " +
              new Intl.DateTimeFormat(undefined, {
                timeZone: period.semester.timezone,
                dateStyle: "full",
                timeStyle: "short",
              }).format(new Date(period.currentWeek.deadlineAt)) +
              " · " +
              period.semester.timezone
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
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ["On Time", counts.on_time, "success"],
                ["Late", counts.late, "warning"],
                ["Missing", counts.missing, "danger"],
              ] as const
            ).map(([label, value, tone]) => (
              <Card key={label}>
                <CardContent>
                  <p className="text-sm font-semibold text-[var(--muted)]">
                    {label}
                  </p>
                  <div className="mt-2 flex items-end justify-between">
                    <p className="text-4xl font-bold text-[var(--navy)]">
                      {value}
                    </p>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-5">
            <CardContent>
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
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {member.submittedAt
                          ? new Intl.DateTimeFormat(undefined, {
                              timeZone: period.semester.timezone,
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(member.submittedAt))
                          : "Not submitted"}
                      </p>
                    </div>
                    <Badge
                      tone={
                        member.submissionStatus === "on_time"
                          ? "success"
                          : member.submissionStatus === "late"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {labels[member.submissionStatus]}
                    </Badge>
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
