import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  scheduleHighlights,
  type ScheduleEntry,
} from "@/features/schedule/queries";

function formatDate(entry: ScheduleEntry) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: entry.semesterTimezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${entry.sessionDate}T12:00:00`));
}

function formatTime(entry: ScheduleEntry) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone: entry.semesterTimezone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatter.format(new Date(entry.startsAt))}–${formatter.format(new Date(entry.endsAt))}`;
}

export function SchedulePreviewCard({
  entries,
  memberId,
  title = "Study schedule",
}: {
  entries: ScheduleEntry[];
  memberId?: string;
  title?: string;
}) {
  const highlights = scheduleHighlights(entries, memberId);
  const label =
    highlights.state === "happening"
      ? "Happening now"
      : highlights.state === "upcoming"
        ? "Next session"
        : "No upcoming sessions";
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays
              className="size-5 text-[var(--navy)]"
              aria-hidden="true"
            />
            <h2 className="text-xl font-bold text-[var(--navy)]">{title}</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {memberId
              ? "Your assigned proctor shifts"
              : "Recurring proctor sessions"}
          </p>
        </div>
        <Badge tone={highlights.state === "empty" ? "neutral" : "success"}>
          {label}
        </Badge>
      </CardHeader>
      <CardContent>
        {highlights.entries.length ? (
          <div className="space-y-3">
            {highlights.entries.map((entry) => (
              <article
                key={entry.occurrenceId}
                className="rounded-xl bg-[var(--surface-subtle)] p-4"
              >
                <p className="font-bold text-[var(--navy)]">
                  {formatDate(entry)} · {formatTime(entry)}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]">
                  <MapPin className="size-4" aria-hidden="true" />{" "}
                  {entry.location}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]">
                  <Users className="size-4" aria-hidden="true" />
                  {entry.proctors
                    .map((proctor) => proctor.fullName)
                    .join(", ") || "No proctor assigned"}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">
            No upcoming study sessions are scheduled in this semester.
          </p>
        )}
        <Link
          href={"/schedule" as never}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border font-semibold text-[var(--navy)] hover:bg-[var(--surface-subtle)]"
        >
          View full schedule
        </Link>
      </CardContent>
    </Card>
  );
}
