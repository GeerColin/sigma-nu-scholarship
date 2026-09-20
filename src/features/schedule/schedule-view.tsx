import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  editScheduleOccurrenceByProctor,
  manageScheduleOccurrence,
} from "@/features/schedule/actions";
import type { ScheduleEntry, ScheduleWeek } from "@/features/schedule/queries";
import { dateInTimeZone } from "@/lib/domain/dates";

function shortTime(value: string) {
  return value.slice(0, 5);
}

function displayDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function displayTime(entry: ScheduleEntry) {
  return `${new Intl.DateTimeFormat(undefined, {
    timeZone: entry.semesterTimezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(entry.startsAt))}–${new Intl.DateTimeFormat(undefined, {
    timeZone: entry.semesterTimezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(entry.endsAt))}`;
}

function hiddenOccurrenceFields(
  entry: ScheduleEntry,
  week: ScheduleWeek | null,
) {
  return (
    <>
      <input type="hidden" name="occurrenceId" value={entry.occurrenceId} />
      {week && <input type="hidden" name="week" value={week.sequenceNumber} />}
    </>
  );
}

function OccurrenceCard({
  entry,
  week,
  canManage,
  proctorMemberId,
}: {
  entry: ScheduleEntry;
  week: ScheduleWeek | null;
  canManage: boolean;
  proctorMemberId: string | null;
}) {
  const today = dateInTimeZone(new Date(), entry.semesterTimezone);
  const isPast = entry.sessionDate < today;
  const assignedToViewer = Boolean(
    proctorMemberId &&
    entry.proctors.some((proctor) => proctor.memberId === proctorMemberId),
  );
  return (
    <article
      id={`occurrence-${entry.occurrenceId}`}
      className="rounded-xl border bg-white p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-[var(--navy)]">{displayTime(entry)}</p>
            {entry.cancelled && <Badge tone="danger">Cancelled</Badge>}
          </div>
          <p className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {entry.location}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]">
            <Users aria-hidden="true" className="size-4 shrink-0" />
            {entry.proctors.length
              ? entry.proctors.map((proctor) => proctor.fullName).join(", ")
              : "No Proctor assigned"}
          </p>
          {entry.instructions && (
            <p className="mt-3 rounded-lg bg-[var(--surface-subtle)] p-3 text-sm text-[var(--muted)]">
              {entry.instructions}
            </p>
          )}
          {entry.cancelled && entry.cancellationReason && (
            <p className="mt-3 text-sm text-[var(--danger)]">
              Reason: {entry.cancellationReason}
            </p>
          )}
        </div>
        {entry.cancelled ? (
          canManage &&
          !isPast && (
            <form action={manageScheduleOccurrence}>
              {hiddenOccurrenceFields(entry, week)}
              <input type="hidden" name="operation" value="restore" />
              <SubmitButton
                className="bg-transparent text-[var(--navy)] shadow-none ring-1 ring-[var(--border)] hover:bg-[var(--surface-subtle)]"
                pendingLabel="Restoring…"
              >
                Restore occurrence
              </SubmitButton>
            </form>
          )
        ) : (
          <div className="flex flex-wrap gap-2">
            {assignedToViewer && !isPast && (
              <details className="rounded-xl border">
                <summary className="min-h-11 cursor-pointer px-3 py-2.5 text-sm font-semibold text-[var(--navy)]">
                  Edit this date
                </summary>
                <form
                  action={editScheduleOccurrenceByProctor}
                  className="grid gap-3 border-t p-3 sm:min-w-80"
                >
                  <input
                    type="hidden"
                    name="occurrenceId"
                    value={entry.occurrenceId}
                  />
                  {week && (
                    <input
                      type="hidden"
                      name="week"
                      value={week.sequenceNumber}
                    />
                  )}
                  <p className="text-sm text-[var(--muted)]">
                    Applies only to{" "}
                    {displayDate(entry.sessionDate, entry.semesterTimezone)}. It
                    does not change the recurring schedule or assignments.
                  </p>
                  <label>
                    <span className="mb-1 block text-sm font-semibold">
                      Start time
                    </span>
                    <input
                      name="startTime"
                      type="time"
                      required
                      defaultValue={shortTime(entry.startTime)}
                      className="min-h-11 w-full rounded-xl border px-3"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold">
                      End time
                    </span>
                    <input
                      name="endTime"
                      type="time"
                      required
                      defaultValue={shortTime(entry.endTime)}
                      className="min-h-11 w-full rounded-xl border px-3"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-semibold">
                      Location
                    </span>
                    <input
                      name="location"
                      required
                      maxLength={200}
                      defaultValue={entry.location}
                      className="min-h-11 w-full rounded-xl border px-3"
                    />
                  </label>
                  <SubmitButton pendingLabel="Saving change…">
                    Save this date only
                  </SubmitButton>
                </form>
              </details>
            )}
            {canManage && !isPast && (
              <details className="rounded-xl border">
                <summary className="min-h-11 cursor-pointer px-3 py-2.5 text-sm font-semibold text-[var(--navy)]">
                  Manage date
                </summary>
                <div className="grid gap-4 border-t p-3">
                  <form
                    action={manageScheduleOccurrence}
                    className="grid gap-3"
                  >
                    {hiddenOccurrenceFields(entry, week)}
                    <input type="hidden" name="operation" value="override" />
                    <label>
                      <span className="mb-1 block text-sm font-semibold">
                        Start time
                      </span>
                      <input
                        name="startTime"
                        type="time"
                        required
                        defaultValue={shortTime(entry.startTime)}
                        className="min-h-11 w-full rounded-xl border px-3"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-sm font-semibold">
                        End time
                      </span>
                      <input
                        name="endTime"
                        type="time"
                        required
                        defaultValue={shortTime(entry.endTime)}
                        className="min-h-11 w-full rounded-xl border px-3"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-sm font-semibold">
                        Location
                      </span>
                      <input
                        name="location"
                        required
                        maxLength={200}
                        defaultValue={entry.location}
                        className="min-h-11 w-full rounded-xl border px-3"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-sm font-semibold">
                        Instructions
                      </span>
                      <textarea
                        name="instructions"
                        maxLength={1000}
                        defaultValue={entry.instructions ?? ""}
                        rows={2}
                        className="w-full rounded-xl border p-3"
                      />
                    </label>
                    <SubmitButton pendingLabel="Saving change…">
                      Save dated change
                    </SubmitButton>
                  </form>
                  <form
                    action={manageScheduleOccurrence}
                    className="grid gap-3 border-t pt-3"
                  >
                    {hiddenOccurrenceFields(entry, week)}
                    <input type="hidden" name="operation" value="cancel" />
                    <label>
                      <span className="mb-1 block text-sm font-semibold">
                        Cancellation reason
                      </span>
                      <input
                        name="reason"
                        required
                        maxLength={500}
                        className="min-h-11 w-full rounded-xl border px-3"
                      />
                    </label>
                    <SubmitButton
                      className="bg-[var(--danger)] hover:bg-[var(--danger)]"
                      pendingLabel="Cancelling…"
                    >
                      Cancel this date
                    </SubmitButton>
                  </form>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function ScheduleView({
  weeks,
  selectedWeek,
  entries,
  canManage,
  proctorMemberId = null,
}: {
  weeks: ScheduleWeek[];
  selectedWeek: ScheduleWeek | null;
  entries: ScheduleEntry[];
  canManage: boolean;
  proctorMemberId?: string | null;
}) {
  const grouped = new Map<string, ScheduleEntry[]>();
  for (const entry of entries) {
    grouped.set(entry.sessionDate, [
      ...(grouped.get(entry.sessionDate) ?? []),
      entry,
    ]);
  }
  const timeZone = entries[0]?.semesterTimezone ?? "UTC";
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays
              aria-hidden="true"
              className="size-5 text-[var(--navy)]"
            />
            <h2 className="text-xl font-bold text-[var(--navy)]">
              Browse schedule
            </h2>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Schedule weeks">
            {weeks.map((week) => (
              <Link
                key={week.id}
                href={`/schedule?week=${week.sequenceNumber}` as never}
                aria-current={selectedWeek?.id === week.id ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${selectedWeek?.id === week.id ? "bg-[var(--navy)] text-white" : "border text-[var(--navy)] hover:bg-[var(--surface-subtle)]"}`}
              >
                {week.label}
              </Link>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {selectedWeek && (
            <p className="mb-5 text-sm text-[var(--muted)]">
              {selectedWeek.startsOn} through {selectedWeek.endsOn}
            </p>
          )}
          {!entries.length ? (
            <p className="rounded-xl bg-[var(--surface-subtle)] p-6 text-center text-[var(--muted)]">
              No study sessions are scheduled for this week.
            </p>
          ) : (
            <div className="space-y-5">
              {[...grouped.entries()].map(([date, dateEntries]) => (
                <section key={date}>
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="font-bold text-[var(--navy)]">
                      {displayDate(date, timeZone)}
                    </h3>
                    {dateEntries.length > 1 && (
                      <Badge tone="warning">Concurrent sessions</Badge>
                    )}
                  </div>
                  <div className="grid gap-3">
                    {dateEntries.map((entry) => (
                      <OccurrenceCard
                        key={entry.occurrenceId}
                        entry={entry}
                        week={selectedWeek}
                        canManage={canManage}
                        proctorMemberId={proctorMemberId}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
