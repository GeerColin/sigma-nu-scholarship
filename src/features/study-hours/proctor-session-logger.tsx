"use client";

import { useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { recordStudySession } from "@/features/study-hours/actions";

type MemberOption = { memberId: string; fullName: string };
type SessionItem = {
  id: string;
  memberName: string;
  date: string;
  durationMinutes: number;
  notes?: string | null;
};

export function ProctorSessionLogger({
  members,
  weekId,
  weekLabel,
  initialSessions,
  demo,
}: {
  members: MemberOption[];
  weekId: string;
  weekLabel: string;
  initialSessions: SessionItem[];
  demo: boolean;
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [memberName, setMemberName] = useState("");
  const memberId = useMemo(
    () =>
      members.find((member) => member.fullName === memberName)?.memberId ?? "",
    [memberName, members],
  );
  const today = new Date().toISOString().slice(0, 10);
  function submitDemo(formData: FormData) {
    const hours = Number(formData.get("hours"));
    setSessions((current) => [
      {
        id: crypto.randomUUID(),
        memberName,
        date: String(formData.get("date")),
        durationMinutes: Math.round(hours * 60),
        notes: String(formData.get("notes") ?? ""),
      },
      ...current,
    ]);
    setMemberName("");
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Record study hours
          </h2>
        </CardHeader>
        <CardContent>
          <form
            action={demo ? submitDemo : recordStudySession}
            className="space-y-4"
          >
            <input type="hidden" name="memberId" value={memberId} />
            <input type="hidden" name="weekId" value={weekId} />
            <label className="block">
              <span className="mb-1.5 block font-semibold">Member</span>
              <input
                list="active-members"
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
            </label>
            <label className="block">
              <span className="mb-1.5 block font-semibold">Hours</span>
              <input
                name="hours"
                required
                type="number"
                min="0.25"
                max="24"
                step="0.25"
                defaultValue="1"
                className="min-h-12 w-full rounded-xl border px-3"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-semibold">Date</span>
              <input
                name="date"
                required
                type="date"
                defaultValue={today}
                className="min-h-12 w-full rounded-xl border px-3"
              />
            </label>
            <div className="rounded-xl bg-[var(--surface-subtle)] p-3">
              <p className="text-sm font-semibold text-[var(--muted)]">
                Academic week
              </p>
              <p className="font-bold text-[var(--navy)]">{weekLabel}</p>
            </div>
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
            <Button type="submit" disabled={!memberId} className="w-full">
              <Clock3 className="mr-2 size-4" />
              Record study hours
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Sessions you recorded
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Current-week entries can be corrected; older entries are locked.
          </p>
        </CardHeader>
        <div className="divide-y">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between gap-4 p-5"
            >
              <div>
                <p className="font-bold text-[var(--navy)]">
                  {session.memberName}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {session.date}
                  {session.notes ? ` · ${session.notes}` : ""}
                </p>
              </div>
              <p className="text-xl font-bold text-[var(--navy)]">
                {session.durationMinutes / 60} hr
              </p>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="p-8 text-center text-[var(--muted)]">
              You have not recorded any sessions this week.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
