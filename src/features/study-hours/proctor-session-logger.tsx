"use client";

import { useMemo, useState } from "react";
import { Clock3, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  correctStudySession,
  editOwnStudySession,
  recordStudySession,
} from "@/features/study-hours/actions";

type MemberOption = { memberId: string; fullName: string };
export type SessionItem = {
  id: string;
  memberName: string;
  proctorName: string;
  date: string;
  durationMinutes: number;
  notes?: string | null;
  weekId: string;
  weekLabel: string;
  weekStartsOn: string;
  weekEndsOn: string;
  isCurrentWeek: boolean;
  ownedByViewer: boolean;
};

export function ProctorSessionLogger({
  members,
  weekId,
  weekLabel,
  currentWeekStartsOn,
  currentWeekEndsOn,
  defaultSessionDate,
  initialSessions,
  canCorrectAll,
}: {
  members: MemberOption[];
  weekId: string | null;
  weekLabel: string;
  currentWeekStartsOn: string | null;
  currentWeekEndsOn: string | null;
  defaultSessionDate: string;
  initialSessions: SessionItem[];
  canCorrectAll: boolean;
}) {
  const [memberName, setMemberName] = useState("");
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const memberId = useMemo(
    () =>
      members.find((member) => member.fullName === memberName)?.memberId ?? "",
    [memberName, members],
  );
  const defaultDate = currentWeekStartsOn
    ? defaultSessionDate < currentWeekStartsOn
      ? currentWeekStartsOn
      : currentWeekEndsOn && defaultSessionDate > currentWeekEndsOn
        ? currentWeekEndsOn
        : defaultSessionDate
    : defaultSessionDate;
  const totalHours = durationHours + durationMinutes / 60;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Record study hours
          </h2>
        </CardHeader>
        <CardContent>
          {weekId ? (
            <form action={recordStudySession} className="space-y-4">
              <input type="hidden" name="memberId" value={memberId} />
              <input type="hidden" name="weekId" value={weekId} />
              <input type="hidden" name="hours" value={totalHours} />
              <div className="rounded-xl bg-[var(--surface-subtle)] p-3">
                <p className="text-sm font-semibold text-[var(--muted)]">
                  Recording for
                </p>
                <p className="font-bold text-[var(--navy)]">{weekLabel}</p>
              </div>
              <label className="block">
                <span className="mb-1.5 block font-semibold">Member</span>
                <input
                  list="active-members"
                  aria-label="Member"
                  aria-describedby="member-search-help"
                  required
                  value={memberName}
                  onChange={(event) => setMemberName(event.target.value)}
                  placeholder="Search active members"
                  className="min-h-12 w-full rounded-xl border px-3"
                />
                <datalist id="active-members">
                  {members.map((member) => (
                    <option key={member.memberId} value={member.fullName} />
                  ))}
                </datalist>
                <span
                  id="member-search-help"
                  className="mt-1 block text-sm text-[var(--muted)]"
                >
                  Start typing, then select the member’s exact name.
                </span>
              </label>
              <fieldset>
                <legend className="mb-1.5 font-semibold">Duration</legend>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="mb-1 block text-sm text-[var(--muted)]">
                      Hours
                    </span>
                    <input
                      required
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="24"
                      step="1"
                      value={durationHours}
                      onChange={(event) =>
                        setDurationHours(Number(event.target.value))
                      }
                      className="min-h-12 w-full rounded-xl border px-3"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm text-[var(--muted)]">
                      Minutes
                    </span>
                    <select
                      value={durationMinutes}
                      onChange={(event) =>
                        setDurationMinutes(Number(event.target.value))
                      }
                      className="min-h-12 w-full rounded-xl border bg-white px-3"
                    >
                      {[0, 15, 30, 45].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </fieldset>
              <label className="block">
                <span className="mb-1.5 block font-semibold">Date</span>
                <input
                  name="date"
                  required
                  type="date"
                  min={currentWeekStartsOn ?? undefined}
                  max={currentWeekEndsOn ?? undefined}
                  defaultValue={defaultDate}
                  className="min-h-12 w-full rounded-xl border px-3"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-semibold">
                  Notes{" "}
                  <span className="font-normal text-[var(--muted)]">
                    (optional)
                  </span>
                </span>
                <textarea
                  name="notes"
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-xl border p-3"
                />
              </label>
              <SubmitButton
                type="submit"
                disabled={!memberId || totalHours <= 0 || totalHours > 24}
                className="w-full"
              >
                <Clock3 className="mr-2 size-4" />
                Record study hours
              </SubmitButton>
            </form>
          ) : (
            <div>
              <p className="font-bold text-[var(--navy)]">
                No current academic week
              </p>
              <p className="mt-2 text-[var(--muted)]">
                Session logging is available after an active semester covers
                today.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            {canCorrectAll ? "Chapter study sessions" : "Sessions you recorded"}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {canCorrectAll
              ? "Chair and Admin corrections require a reason and remain in the audit log."
              : "Only your current-week entries can be edited; older entries are locked."}
          </p>
        </CardHeader>
        <div className="divide-y">
          {initialSessions.map((session) => {
            const editable =
              canCorrectAll || (session.ownedByViewer && session.isCurrentWeek);
            return (
              <article key={session.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-[var(--navy)]">
                      {session.memberName}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {session.date} · {session.weekLabel}
                      {canCorrectAll
                        ? " · Recorded by " + session.proctorName
                        : ""}
                      {session.notes ? " · " + session.notes : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-[var(--navy)]">
                      {session.durationMinutes / 60} hr
                    </p>
                    {!editable && <Badge>Locked</Badge>}
                  </div>
                </div>
                {editable && (
                  <details className="mt-4 rounded-xl border">
                    <summary className="cursor-pointer p-3 font-semibold text-[var(--navy)]">
                      {canCorrectAll ? "Correct entry" : "Edit entry"}
                    </summary>
                    <form
                      action={
                        canCorrectAll
                          ? correctStudySession
                          : editOwnStudySession
                      }
                      className="grid gap-3 border-t p-3 sm:grid-cols-2"
                    >
                      <input
                        type="hidden"
                        name="sessionId"
                        value={session.id}
                      />
                      <label>
                        <span className="mb-1 block text-sm font-semibold">
                          Date
                        </span>
                        <input
                          name="date"
                          required
                          type="date"
                          min={session.weekStartsOn}
                          max={session.weekEndsOn}
                          defaultValue={session.date}
                          className="min-h-11 w-full rounded-xl border px-3"
                        />
                      </label>
                      <label>
                        <span className="mb-1 block text-sm font-semibold">
                          Duration in hours
                        </span>
                        <input
                          name="hours"
                          required
                          type="number"
                          min="0.25"
                          max="24"
                          step="0.25"
                          defaultValue={session.durationMinutes / 60}
                          className="min-h-11 w-full rounded-xl border px-3"
                        />
                        <span className="mt-1 block text-xs text-[var(--muted)]">
                          Use quarter hours, such as 1.25 for 1 hour 15 minutes.
                        </span>
                      </label>
                      <label className="sm:col-span-2">
                        <span className="mb-1 block text-sm font-semibold">
                          Notes
                        </span>
                        <input
                          name="notes"
                          maxLength={500}
                          defaultValue={session.notes ?? ""}
                          className="min-h-11 w-full rounded-xl border px-3"
                        />
                      </label>
                      {canCorrectAll && (
                        <label className="sm:col-span-2">
                          <span className="mb-1 block text-sm font-semibold">
                            Correction reason
                          </span>
                          <input
                            name="reason"
                            required
                            minLength={2}
                            maxLength={500}
                            className="min-h-11 w-full rounded-xl border px-3"
                          />
                        </label>
                      )}
                      <SubmitButton type="submit" className="sm:col-span-2">
                        <Save className="mr-2 size-4" />
                        Save {canCorrectAll ? "correction" : "entry"}
                      </SubmitButton>
                    </form>
                  </details>
                )}
              </article>
            );
          })}
          {initialSessions.length === 0 && (
            <p className="p-8 text-center text-[var(--muted)]">
              No study sessions are available.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
