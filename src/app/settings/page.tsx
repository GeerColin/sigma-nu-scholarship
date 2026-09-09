import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  activateSemester,
  createSemester,
  overrideAcademicWeekDeadline,
} from "@/features/settings/actions";
import { ChapterConfiguration } from "@/features/settings/chapter-configuration";
import { requireChairContext } from "@/lib/auth/guards";
import { dateInTimeZone, timeInTimeZone } from "@/lib/domain/dates";
import { createClient } from "@/lib/supabase/server";

const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const statusMessages: Record<string, string> = {
  "semester-created": "The semester and its academic weeks were created.",
  "semester-activated": "The selected semester is now active.",
  "deadline-updated": "The academic-week deadline was updated.",
  "configuration-updated": "Chapter configuration was updated and audited.",
  "email-template-saved": "A new active email-template version was saved.",
};

function formatDeadline(value: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const context = await requireChairContext();
  const query = await searchParams;
  const supabase = await createClient();
  const { data: semesters, error } = await supabase
    .from("semesters")
    .select(
      "id, name, start_date, end_date, timezone, default_deadline_weekday, default_deadline_time, active, academic_weeks(id, sequence_number, label, starts_on, ends_on, deadline_at, deadline_overridden)",
    )
    .eq("chapter_id", context.chapterId!)
    .order("start_date", { ascending: false });
  if (error) throw new Error("Could not load semester configuration.");
  const activeSemester = (semesters ?? []).find((semester) => semester.active);

  return (
    <ChairAppShell>
      <PageHeading
        eyebrow="Chapter policy"
        title="Semester settings"
        description="Create academic calendars, choose the active semester, and adjust individual weekly deadlines without rewriting prior terms."
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
          We couldn’t save that semester change. Nothing was overwritten. Check
          the dates, timezone, and deadline before trying again.
        </p>
      )}

      {!activeSemester && (
        <div className="mb-5 rounded-xl bg-[var(--warning-soft)] p-4">
          <p className="font-bold text-[var(--navy)]">
            No active semester configured.
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Set up the current semester to begin weekly academic workflows.
          </p>
        </div>
      )}

      <ChapterConfiguration />

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-[var(--navy)]">
              Create semester
            </h2>
          </CardHeader>
          <CardContent>
            <form action={createSemester} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block font-semibold">
                  Semester name
                </span>
                <input
                  name="name"
                  required
                  maxLength={100}
                  placeholder="Fall 2026"
                  className="min-h-11 w-full rounded-xl border px-3"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block font-semibold">Start date</span>
                  <input
                    name="startDate"
                    required
                    type="date"
                    className="min-h-11 w-full rounded-xl border px-3"
                  />
                </label>
                <label>
                  <span className="mb-1.5 block font-semibold">End date</span>
                  <input
                    name="endDate"
                    required
                    type="date"
                    className="min-h-11 w-full rounded-xl border px-3"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block font-semibold">Timezone</span>
                <input
                  name="timezone"
                  required
                  defaultValue="America/New_York"
                  className="min-h-11 w-full rounded-xl border px-3"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block font-semibold">
                    Weekly deadline day
                  </span>
                  <select
                    name="deadlineWeekday"
                    defaultValue="5"
                    className="min-h-11 w-full rounded-xl border bg-white px-3"
                  >
                    {weekdays.map((weekday, index) => (
                      <option key={weekday} value={index}>
                        {weekday}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 block font-semibold">
                    Weekly deadline time
                  </span>
                  <input
                    name="deadlineTime"
                    required
                    type="time"
                    defaultValue="23:59"
                    className="min-h-11 w-full rounded-xl border px-3"
                  />
                </label>
              </div>
              <label className="flex items-start gap-3 rounded-xl bg-[var(--surface-subtle)] p-3">
                <input
                  type="checkbox"
                  name="makeActive"
                  defaultChecked
                  className="mt-1 size-4"
                />
                <span>
                  <span className="block font-semibold">
                    Make this the active semester
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    Prior semester records remain unchanged.
                  </span>
                </span>
              </label>
              <Button type="submit" className="w-full">
                Create semester and weeks
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-5">
          {(semesters ?? []).map((semester) => (
            <Card key={semester.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-[var(--navy)]">
                      {semester.name}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {semester.start_date} through {semester.end_date} ·{" "}
                      {semester.timezone}
                    </p>
                  </div>
                  {semester.active ? (
                    <Badge tone="success">Active</Badge>
                  ) : (
                    <form action={activateSemester}>
                      <input
                        type="hidden"
                        name="semesterId"
                        value={semester.id}
                      />
                      <Button
                        type="submit"
                        className="bg-transparent text-[var(--navy)] shadow-none ring-1 ring-[var(--border)] hover:bg-[var(--surface-subtle)]"
                      >
                        Make active
                      </Button>
                    </form>
                  )}
                </div>
              </CardHeader>
              <div className="divide-y">
                {(
                  semester.academic_weeks as Array<{
                    id: string;
                    sequence_number: number;
                    label: string;
                    starts_on: string;
                    ends_on: string;
                    deadline_at: string;
                    deadline_overridden: boolean;
                  }>
                )
                  .toSorted((a, b) => a.sequence_number - b.sequence_number)
                  .map((week) => (
                    <article
                      key={week.id}
                      className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-end"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-[var(--navy)]">
                            {week.label}
                          </p>
                          {week.deadline_overridden && (
                            <Badge tone="warning">Overridden</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {week.starts_on}–{week.ends_on} · Deadline{" "}
                          {formatDeadline(week.deadline_at, semester.timezone)}
                        </p>
                      </div>
                      {semester.active && (
                        <form
                          action={overrideAcademicWeekDeadline}
                          className="flex flex-wrap gap-2"
                        >
                          <input type="hidden" name="weekId" value={week.id} />
                          <label>
                            <span className="sr-only">
                              New deadline date for {week.label}
                            </span>
                            <input
                              name="deadlineDate"
                              required
                              type="date"
                              min={week.starts_on}
                              max={week.ends_on}
                              defaultValue={dateInTimeZone(
                                new Date(week.deadline_at),
                                semester.timezone,
                              )}
                              className="min-h-11 rounded-xl border px-3"
                            />
                          </label>
                          <label>
                            <span className="sr-only">
                              New deadline time for {week.label}
                            </span>
                            <input
                              name="deadlineTime"
                              required
                              type="time"
                              defaultValue={timeInTimeZone(
                                new Date(week.deadline_at),
                                semester.timezone,
                              )}
                              className="min-h-11 rounded-xl border px-3"
                            />
                          </label>
                          <Button
                            type="submit"
                            className="bg-transparent text-[var(--navy)] shadow-none ring-1 ring-[var(--border)] hover:bg-[var(--surface-subtle)]"
                          >
                            Update deadline
                          </Button>
                        </form>
                      )}
                    </article>
                  ))}
              </div>
            </Card>
          ))}
          {!semesters?.length && (
            <Card>
              <CardContent>
                <p className="text-center text-[var(--muted)]">
                  No semesters have been configured.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ChairAppShell>
  );
}
