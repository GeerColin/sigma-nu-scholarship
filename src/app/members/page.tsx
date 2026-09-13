import Link from "next/link";
import { Search } from "lucide-react";
import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getMemberDirectory,
  type MemberDirectoryItem,
} from "@/features/members/queries";

function optionalNumber(value: string | undefined) {
  if (value === undefined || value.trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function formatHours(minutes: number) {
  return `${(minutes / 60).toLocaleString(undefined, { maximumFractionDigits: 2 })} hr`;
}

const submissionLabels = {
  on_time: "On Time",
  late: "Late",
  missing: "Missing",
  not_configured: "No current week",
} as const;

function submissionTone(status: MemberDirectoryItem["submissionStatus"]) {
  return status === "on_time"
    ? "success"
    : status === "late"
      ? "warning"
      : status === "missing"
        ? "danger"
        : "neutral";
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    q?: string;
    gpaMin?: string;
    gpaMax?: string;
  }>;
}) {
  const params = await searchParams;
  const gpaMin = optionalNumber(params.gpaMin);
  const gpaMax = optionalNumber(params.gpaMax);
  const { members, period } = await getMemberDirectory({
    q: params.q,
    filter: params.filter,
    gpaMin,
    gpaMax,
  });
  const gpaLabel = period
    ? `Estimated ${period.semester.name} GPA`
    : "Estimated semester GPA";

  return (
    <ChairAppShell>
      <PageHeading
        eyebrow="Roster"
        title="Members"
        description="Search active and historical members and open a profile for secure academic review."
      />

      {!period && (
        <div className="mb-5 rounded-xl border border-[var(--warning)]/25 bg-[var(--warning-soft)] p-4">
          <p className="font-bold text-[var(--navy)]">
            No active semester configured.
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Set up the current semester to calculate weekly academic status.
          </p>
          <Link
            href="/settings"
            className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[var(--navy)] px-4 font-semibold text-white"
          >
            Set up semester
          </Link>
        </div>
      )}

      <Card>
        <CardContent>
          <form className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,14rem)_auto]">
            <label className="relative">
              <span className="sr-only">Search members</span>
              <Search className="pointer-events-none absolute top-3.5 left-3 size-5 text-[var(--muted)]" />
              <input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search members"
                className="min-h-12 w-full rounded-xl border bg-white pr-4 pl-10"
              />
            </label>
            <select
              name="filter"
              defaultValue={params.filter ?? "all"}
              aria-label="Filter members"
              className="min-h-12 rounded-xl border bg-white px-4"
            >
              <option value="all">All members</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="alumni">Alumni</option>
              <option value="missing">Missing grades</option>
              <option value="incomplete">Incomplete hours</option>
              <option value="alerts">Academic alert</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="sr-only">Minimum estimated GPA</span>
                <input
                  name="gpaMin"
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  defaultValue={params.gpaMin ?? ""}
                  placeholder="Min GPA"
                  className="min-h-12 w-full rounded-xl border px-3"
                />
              </label>
              <label>
                <span className="sr-only">Maximum estimated GPA</span>
                <input
                  name="gpaMax"
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  defaultValue={params.gpaMax ?? ""}
                  placeholder="Max GPA"
                  className="min-h-12 w-full rounded-xl border px-3"
                />
              </label>
            </div>
            <button className="min-h-12 rounded-xl bg-[var(--navy)] px-5 font-semibold text-white">
              Apply
            </button>
          </form>

          <div className="grid gap-3 xl:hidden">
            {members.map((member) => {
              const remaining =
                member.requiredMinutes === null
                  ? null
                  : Math.max(
                      member.requiredMinutes - member.completedMinutes,
                      0,
                    );
              return (
                <Link
                  key={member.id}
                  href={`/members/${member.id}`}
                  className="rounded-xl border p-4 transition hover:bg-[var(--surface-subtle)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[var(--navy)]">
                        {member.name}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)] capitalize">
                        {member.status} · {gpaLabel}:{" "}
                        {member.estimatedGpa?.toFixed(2) ?? "—"}
                      </p>
                    </div>
                    <Badge tone={submissionTone(member.submissionStatus)}>
                      {submissionLabels[member.submissionStatus]}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {member.hasAcademicAlert && (
                      <Badge tone="warning">Academic alert</Badge>
                    )}
                    {!member.connected && <Badge>Not connected</Badge>}
                  </div>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    Study hours:{" "}
                    {member.requiredMinutes === null
                      ? "No assignment"
                      : `${formatHours(member.completedMinutes)} of ${formatHours(member.requiredMinutes)}`}
                    {remaining !== null && remaining > 0
                      ? ` · ${formatHours(remaining)} remaining`
                      : ""}
                  </p>
                </Link>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[54rem] text-left">
              <thead>
                <tr className="border-b text-sm text-[var(--muted)]">
                  <th className="pb-3 font-semibold">Member</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">{gpaLabel}</th>
                  <th className="pb-3 font-semibold">Check-in</th>
                  <th className="pb-3 font-semibold">Study hours</th>
                  <th className="pb-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const remaining =
                    member.requiredMinutes === null
                      ? null
                      : Math.max(
                          member.requiredMinutes - member.completedMinutes,
                          0,
                        );
                  return (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-[var(--navy)]">
                            {member.name}
                          </span>
                          {member.hasAcademicAlert && (
                            <Badge tone="warning">Academic alert</Badge>
                          )}
                          {!member.connected && <Badge>Not connected</Badge>}
                        </div>
                      </td>
                      <td className="py-4 capitalize">{member.status}</td>
                      <td className="py-4">
                        {member.estimatedGpa?.toFixed(2) ?? "—"}
                      </td>
                      <td className="py-4">
                        <Badge tone={submissionTone(member.submissionStatus)}>
                          {submissionLabels[member.submissionStatus]}
                        </Badge>
                      </td>
                      <td className="py-4">
                        {member.requiredMinutes === null
                          ? "No assignment"
                          : `${formatHours(member.completedMinutes)} / ${formatHours(member.requiredMinutes)}`}
                        {remaining !== null && remaining > 0 && (
                          <span className="mt-0.5 block text-xs text-[var(--muted)]">
                            {formatHours(remaining)} remaining
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <Link
                          href={`/members/${member.id}`}
                          className="font-semibold text-[var(--navy)] underline-offset-4 hover:underline"
                        >
                          View profile
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!members.length && (
            <div className="py-10 text-center">
              <p className="text-[var(--muted)]">
                No members match these filters.
              </p>
              <Link
                href="/members"
                className="mt-3 inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline"
              >
                Clear filters
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </ChairAppShell>
  );
}
