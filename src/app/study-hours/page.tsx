import Link from "next/link";
import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMemberDirectory } from "@/features/members/queries";
import {
  configureStudyHourRuleSet,
  freezeStudyHourAssignment,
  overrideStudyHourAssignment,
  refreshCurrentWeekStudyHours,
  removeStudyHourOverride,
  resolveStudyHourAssignment,
} from "@/features/study-hours/actions";
import { DEFAULT_STUDY_HOUR_RULES } from "@/lib/domain/study-hours";
import { createClient } from "@/lib/supabase/server";

const filters = [
  "all",
  "complete",
  "in_progress",
  "not_started",
  "overridden",
  "review_required",
] as const;
type HoursFilter = (typeof filters)[number];

const statusMessages: Record<string, string> = {
  overridden: "The study-hour requirement was overridden and audited.",
  "override-removed": "The override was removed and audited.",
  frozen: "The study-hour assignment was frozen.",
  resolved: "The frozen-assignment review was resolved.",
  "rules-configured":
    "A new study-hour rule-set version is active. Refresh this week’s assignments to apply it.",
  "assignments-refreshed":
    "Current-week study-hour assignments were recalculated and audited.",
};

function hourValue(minutes: number) {
  return (minutes / 60).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export default async function StudyHoursPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    status?: string;
    error?: string;
    member?: string;
  }>;
}) {
  const query = await searchParams;
  const selectedFilter = filters.includes(query.filter as HoursFilter)
    ? (query.filter as HoursFilter)
    : "all";
  const { members, period } = await getMemberDirectory({ filter: "active" });
  const supabase = await createClient();
  const { data: activeRule, error: activeRuleError } = await supabase
    .from("study_hour_rule_sets")
    .select(
      "id, version, d_adjustment_hours, f_adjustment_hours, maximum_hours, study_hour_bands(minimum_gpa, maximum_gpa, base_hours, sort_order)",
    )
    .eq("active", true)
    .maybeSingle();
  if (activeRuleError) throw new Error("Could not load study-hour rules.");
  const activeBands = [...(activeRule?.study_hour_bands ?? [])].sort(
    (left, right) => left.sort_order - right.sort_order,
  );
  const defaultBandHours = DEFAULT_STUDY_HOUR_RULES.bands.map(
    (band) => band.baseHours,
  );
  const configuredBandHours = defaultBandHours.map(
    (hours, index) => activeBands[index]?.base_hours ?? hours,
  );
  const withStatus = members.map((member) => {
    const status =
      member.requiredMinutes === null
        ? "not_assigned"
        : member.completedMinutes >= member.requiredMinutes
          ? "complete"
          : member.completedMinutes === 0
            ? "not_started"
            : "in_progress";
    return { ...member, hoursStatus: status };
  });
  const shown = withStatus.filter((member) => {
    if (query.member && member.id !== query.member) return false;
    if (selectedFilter === "all") return true;
    if (selectedFilter === "overridden") return member.overridden;
    if (selectedFilter === "review_required")
      return member.assignmentState === "review_required";
    return member.hoursStatus === selectedFilter;
  });

  return (
    <ChairAppShell>
      <PageHeading
        eyebrow={period?.currentWeek?.label ?? "Academic calendar"}
        title="Study hours"
        description="Compare Required, Completed, and Remaining hours, then review administrative changes when needed."
      />

      {query.status && statusMessages[query.status] && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-[var(--success-soft)] p-4 font-semibold text-[var(--success)]"
        >
          {statusMessages[query.status]}
        </p>
      )}
      {query.error && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-[var(--danger-soft)] p-4 font-semibold text-[var(--danger)]"
        >
          We couldn’t complete that study-hour change. Nothing was changed.
          Check the assignment, reason, and confirmation before trying again.
        </p>
      )}

      <div className="flex flex-col">
        {!period?.currentWeek ? (
          <div className="min-w-0">
            <Card>
              <CardContent>
                <p className="font-bold text-[var(--navy)]">
                  No current academic week
                </p>
                <p className="mt-2 text-[var(--muted)]">
                  Configure an active semester before managing weekly study
                  hours.
                </p>
                <Link
                  href="/settings"
                  className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--navy)] px-4 font-semibold text-white"
                >
                  Set up semester
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="min-w-0">
            <Card>
              <CardContent>
                <form className="mb-5 flex flex-wrap gap-2">
                  {query.member && (
                    <input type="hidden" name="member" value={query.member} />
                  )}
                  {filters.map((filter) => (
                    <button
                      key={filter}
                      name="filter"
                      value={filter}
                      className={
                        "min-h-11 rounded-xl px-4 font-semibold " +
                        (selectedFilter === filter
                          ? "bg-[var(--navy)] text-white"
                          : "border bg-white text-[var(--navy)]")
                      }
                    >
                      {
                        {
                          all: "All",
                          complete: "Complete",
                          in_progress: "In Progress",
                          not_started: "Not Started",
                          overridden: "Overridden",
                          review_required: "Needs Review",
                        }[filter]
                      }
                    </button>
                  ))}
                </form>
                {query.member && (
                  <Link
                    href="/study-hours"
                    className="mb-4 inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline"
                  >
                    Show all members
                  </Link>
                )}
                <div>
                  <table className="block w-full text-left xl:table xl:min-w-[52rem]">
                    <thead className="hidden xl:table-header-group">
                      <tr className="border-b text-sm text-[var(--muted)]">
                        {[
                          "Member",
                          "Required",
                          "Completed",
                          "Remaining",
                          "Status",
                          "Actions",
                        ].map((heading) => (
                          <th key={heading} className="pb-3 font-semibold">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="block xl:table-row-group">
                      {shown.map((member) => {
                        const remaining =
                          member.requiredMinutes === null
                            ? null
                            : Math.max(
                                member.requiredMinutes -
                                  member.completedMinutes,
                                0,
                              );
                        return (
                          <tr
                            key={member.id}
                            className="my-3 block rounded-xl border align-top last:border xl:my-0 xl:table-row xl:rounded-none xl:border-x-0 xl:border-t-0 xl:last:border-0"
                          >
                            <td className="block border-b p-4 xl:table-cell xl:border-0 xl:py-4 xl:pr-3 xl:pl-0">
                              <Link
                                href={("/members/" + member.id) as never}
                                className="font-bold text-[var(--navy)] hover:underline"
                              >
                                {member.name}
                              </Link>
                              {member.overrideReason && (
                                <p className="mt-1 max-w-xs text-xs text-[var(--muted)]">
                                  Override: {member.overrideReason}
                                </p>
                              )}
                            </td>
                            <td className="flex justify-between gap-3 border-b px-4 py-3 xl:table-cell xl:border-0 xl:px-0 xl:py-4">
                              <span className="font-semibold xl:hidden">
                                Required
                              </span>
                              {member.requiredMinutes === null
                                ? "—"
                                : hourValue(member.requiredMinutes) + " hr"}
                            </td>
                            <td className="flex justify-between gap-3 border-b px-4 py-3 xl:table-cell xl:border-0 xl:px-0 xl:py-4">
                              <span className="font-semibold xl:hidden">
                                Completed
                              </span>
                              {hourValue(member.completedMinutes)} hr
                            </td>
                            <td className="flex justify-between gap-3 border-b px-4 py-3 xl:table-cell xl:border-0 xl:px-0 xl:py-4">
                              <span className="font-semibold xl:hidden">
                                Remaining
                              </span>
                              {remaining === null
                                ? "—"
                                : hourValue(remaining) + " hr"}
                            </td>
                            <td className="flex flex-wrap justify-between gap-2 border-b px-4 py-3 xl:table-cell xl:border-0 xl:px-0 xl:py-4">
                              <span className="font-semibold xl:hidden">
                                Status
                              </span>
                              <div>
                                <Badge
                                  tone={
                                    member.hoursStatus === "complete"
                                      ? "success"
                                      : member.hoursStatus === "in_progress"
                                        ? "warning"
                                        : member.hoursStatus === "not_started"
                                          ? "danger"
                                          : "neutral"
                                  }
                                >
                                  {
                                    {
                                      complete: "Complete",
                                      in_progress: "In Progress",
                                      not_started: "Not Started",
                                      not_assigned: "Not Assigned",
                                    }[member.hoursStatus]
                                  }
                                </Badge>
                                {member.overridden && (
                                  <Badge tone="warning" className="mt-1 ml-1">
                                    Overridden
                                  </Badge>
                                )}
                                {member.assignmentState === "frozen" && (
                                  <Badge className="mt-1 ml-1">Frozen</Badge>
                                )}
                                {member.assignmentState ===
                                  "review_required" && (
                                  <Badge tone="danger" className="mt-1 ml-1">
                                    Review required
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="block p-4 xl:table-cell xl:py-4 xl:pr-0 xl:pl-2">
                              {member.assignmentId ? (
                                <details className="w-full rounded-xl border xl:min-w-64">
                                  <summary className="cursor-pointer p-3 font-semibold text-[var(--navy)]">
                                    Manage
                                  </summary>
                                  <div className="space-y-4 border-t p-3">
                                    <form
                                      action={overrideStudyHourAssignment}
                                      className="space-y-3"
                                    >
                                      <input
                                        type="hidden"
                                        name="assignmentId"
                                        value={member.assignmentId}
                                      />
                                      <label className="block">
                                        <span className="mb-1 block text-sm font-semibold">
                                          New required hours
                                        </span>
                                        <input
                                          name="hours"
                                          required
                                          type="number"
                                          min="0"
                                          max="24"
                                          step="1"
                                          defaultValue={
                                            member.requiredMinutes === null
                                              ? 0
                                              : member.requiredMinutes / 60
                                          }
                                          className="min-h-11 w-full rounded-xl border px-3"
                                        />
                                      </label>
                                      <label className="block">
                                        <span className="mb-1 block text-sm font-semibold">
                                          Reason
                                        </span>
                                        <input
                                          name="reason"
                                          required
                                          minLength={2}
                                          maxLength={500}
                                          className="min-h-11 w-full rounded-xl border px-3"
                                        />
                                      </label>
                                      <label className="flex gap-2 text-sm">
                                        <input
                                          type="checkbox"
                                          name="confirmed"
                                          required
                                        />
                                        <span>
                                          I confirm this changes the member’s
                                          required hours.
                                        </span>
                                      </label>
                                      <Button type="submit" className="w-full">
                                        Apply override
                                      </Button>
                                    </form>

                                    {member.overridden && (
                                      <form
                                        action={removeStudyHourOverride}
                                        className="space-y-2 border-t pt-3"
                                      >
                                        <input
                                          type="hidden"
                                          name="assignmentId"
                                          value={member.assignmentId}
                                        />
                                        <input
                                          name="reason"
                                          required
                                          minLength={2}
                                          maxLength={500}
                                          placeholder="Reason for removal"
                                          className="min-h-11 w-full rounded-xl border px-3"
                                        />
                                        <label className="flex items-start gap-2 text-sm">
                                          <input
                                            type="checkbox"
                                            name="confirmed"
                                            required
                                            className="mt-1"
                                          />
                                          <span>
                                            I confirm this override should be
                                            removed.
                                          </span>
                                        </label>
                                        <Button
                                          type="submit"
                                          className="w-full bg-transparent text-[var(--danger)] shadow-none ring-1 ring-[var(--border)]"
                                        >
                                          Remove override
                                        </Button>
                                      </form>
                                    )}

                                    {["draft", "ready"].includes(
                                      member.assignmentState ?? "",
                                    ) && (
                                      <form
                                        action={freezeStudyHourAssignment}
                                        className="space-y-3"
                                      >
                                        <input
                                          type="hidden"
                                          name="assignmentId"
                                          value={member.assignmentId}
                                        />
                                        <label className="flex items-start gap-2 text-sm">
                                          <input
                                            type="checkbox"
                                            name="confirmed"
                                            required
                                            className="mt-1"
                                          />
                                          <span>
                                            I confirm this requirement is ready
                                            to freeze.
                                          </span>
                                        </label>
                                        <Button
                                          type="submit"
                                          className="w-full bg-transparent text-[var(--navy)] shadow-none ring-1 ring-[var(--border)]"
                                        >
                                          Freeze assignment
                                        </Button>
                                      </form>
                                    )}

                                    {member.assignmentState ===
                                      "review_required" && (
                                      <form
                                        action={resolveStudyHourAssignment}
                                        className="space-y-2 border-t pt-3"
                                      >
                                        <input
                                          type="hidden"
                                          name="assignmentId"
                                          value={member.assignmentId}
                                        />
                                        <div className="space-y-1 text-sm text-[var(--muted)]">
                                          <p>
                                            Previously assigned:{" "}
                                            {member.requiredMinutes === null
                                              ? "—"
                                              : hourValue(
                                                  member.requiredMinutes,
                                                )}{" "}
                                            hr
                                          </p>
                                          <p>
                                            New calculation:{" "}
                                            {member.proposedHours ?? "—"} hr
                                          </p>
                                        </div>
                                        <select
                                          name="decision"
                                          className="min-h-11 w-full rounded-xl border bg-white px-3"
                                        >
                                          <option value="keep">
                                            Keep Existing
                                          </option>
                                          <option value="update">
                                            Update Assignment
                                          </option>
                                        </select>
                                        <input
                                          name="reason"
                                          required
                                          minLength={2}
                                          maxLength={500}
                                          placeholder="Decision reason"
                                          className="min-h-11 w-full rounded-xl border px-3"
                                        />
                                        <Button
                                          type="submit"
                                          className="w-full"
                                        >
                                          Resolve review
                                        </Button>
                                      </form>
                                    )}
                                  </div>
                                </details>
                              ) : (
                                <span className="text-sm text-[var(--muted)]">
                                  Awaiting a calculated assignment
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!shown.length && (
                    <p className="py-8 text-center text-[var(--muted)]">
                      No members match this filter.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="mt-5">
          <CardContent>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="font-bold text-[var(--navy)]">
                  {activeRule
                    ? `Study Hour Rules · Current policy version ${activeRule.version}`
                    : "No Study Hour Rules configured"}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Changes apply only after you refresh the current week. Frozen
                  requirements stay unchanged until you review them.
                </p>
              </div>
              {activeRule && period?.currentWeek && (
                <form action={refreshCurrentWeekStudyHours}>
                  <input
                    type="hidden"
                    name="weekId"
                    value={period.currentWeek.id}
                  />
                  <Button type="submit">
                    Refresh Week {period.currentWeek.sequenceNumber}
                  </Button>
                </form>
              )}
            </div>

            <details className="mt-5 rounded-xl border" open={!activeRule}>
              <summary className="cursor-pointer p-4 font-semibold text-[var(--navy)]">
                {activeRule ? "Update Study Hour Rules" : "Configure rules"}
              </summary>
              <form
                action={configureStudyHourRuleSet}
                className="space-y-5 border-t p-4"
              >
                <div>
                  <p className="font-semibold text-[var(--navy)]">
                    Base hours by estimated GPA
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["3.50–4.00", "gpa350To400Hours"],
                      ["3.00–3.49", "gpa300To349Hours"],
                      ["2.75–2.99", "gpa275To299Hours"],
                      ["2.50–2.74", "gpa250To274Hours"],
                      ["2.25–2.49", "gpa225To249Hours"],
                      ["2.00–2.24", "gpa200To224Hours"],
                      ["Below 2.00", "gpaBelow200Hours"],
                    ].map(([label, name], index) => (
                      <label key={name} className="block text-sm font-semibold">
                        {label}
                        <input
                          type="number"
                          name={name}
                          min="0"
                          max="24"
                          step="1"
                          required
                          defaultValue={configuredBandHours[index]}
                          className="mt-1 min-h-11 w-full rounded-xl border px-3"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    [
                      "D adjustment hours",
                      "dAdjustmentHours",
                      activeRule?.d_adjustment_hours ??
                        DEFAULT_STUDY_HOUR_RULES.dAdjustmentHours,
                    ],
                    [
                      "F adjustment hours",
                      "fAdjustmentHours",
                      activeRule?.f_adjustment_hours ??
                        DEFAULT_STUDY_HOUR_RULES.fAdjustmentHours,
                    ],
                    [
                      "Maximum required hours",
                      "maximumHours",
                      activeRule?.maximum_hours ??
                        DEFAULT_STUDY_HOUR_RULES.maximumHours,
                    ],
                  ].map(([label, name, value]) => (
                    <label
                      key={String(name)}
                      className="block text-sm font-semibold"
                    >
                      {String(label)}
                      <input
                        type="number"
                        name={String(name)}
                        min="0"
                        max="24"
                        step="1"
                        required
                        defaultValue={Number(value)}
                        className="mt-1 min-h-11 w-full rounded-xl border px-3"
                      />
                    </label>
                  ))}
                </div>

                <label className="block text-sm font-semibold">
                  Configuration reason
                  <input
                    name="reason"
                    required
                    minLength={2}
                    maxLength={500}
                    placeholder={
                      activeRule
                        ? "Reason for the new version"
                        : "Initial policy setup"
                    }
                    className="mt-1 min-h-11 w-full rounded-xl border px-3"
                  />
                </label>
                <label className="flex gap-2 text-sm">
                  <input type="checkbox" name="confirmed" required />
                  <span>
                    I confirm these are the chapter’s intended study-hour rules.
                  </span>
                </label>
                <Button type="submit">
                  {activeRule ? "Create new version" : "Save initial rules"}
                </Button>
              </form>
            </details>
          </CardContent>
        </Card>
      </div>
    </ChairAppShell>
  );
}
