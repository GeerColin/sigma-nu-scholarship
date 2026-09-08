import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import {
  ProctorSessionLogger,
  type SessionItem,
} from "@/features/study-hours/proctor-session-logger";
import { getActiveAcademicPeriod } from "@/lib/academic/calendar";
import { requireProctorContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const statusMessages: Record<string, string> = {
  recorded: "Study session recorded.",
  updated: "Your current-week session was updated.",
  corrected: "The session correction was saved and audited.",
};

export default async function ProctorPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const params = await searchParams;
  const context = await requireProctorContext();
  const supabase = await createClient();
  const period = await getActiveAcademicPeriod(context.chapterId!);
  const canCorrectAll = context.roles.some((role) =>
    ["admin", "scholarship_chair"].includes(role),
  );

  const { data: directory, error: directoryError } = await supabase.rpc(
    "list_active_members_for_proctor",
  );
  let sessionsQuery = supabase
    .from("study_sessions")
    .select(
      "id, session_date, duration_minutes, notes, proctor_member_id, week_id, member:members!study_sessions_member_id_fkey(full_name), proctor:members!study_sessions_proctor_member_id_fkey(full_name), academic_weeks(label, starts_on, ends_on)",
    )
    .is("voided_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (!canCorrectAll) {
    sessionsQuery = sessionsQuery.eq(
      "proctor_member_id",
      context.memberId!,
    ) as typeof sessionsQuery;
  }
  const { data: sessionRows, error: sessionError } = await sessionsQuery;
  if (directoryError || sessionError) {
    throw new Error("Could not load the Proctor portal.");
  }

  const members = (
    (directory ?? []) as Array<{ member_id: string; full_name: string }>
  ).map((member) => ({
    memberId: member.member_id,
    fullName: member.full_name,
  }));
  const sessions = (sessionRows ?? []).map((session) => {
    const member = session.member as unknown as { full_name: string } | null;
    const proctor = session.proctor as unknown as { full_name: string } | null;
    const week = session.academic_weeks as unknown as {
      label: string;
      starts_on: string;
      ends_on: string;
    };
    return {
      id: session.id,
      memberName: member?.full_name ?? "Unknown member",
      proctorName: proctor?.full_name ?? "Unknown proctor",
      date: session.session_date,
      durationMinutes: session.duration_minutes,
      notes: session.notes,
      weekId: session.week_id,
      weekLabel: week.label,
      weekStartsOn: week.starts_on,
      weekEndsOn: week.ends_on,
      isCurrentWeek: session.week_id === period?.currentWeek?.id,
      ownedByViewer: session.proctor_member_id === context.memberId,
    } satisfies SessionItem;
  });

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-4 sm:p-7">
      <header className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-bold text-[var(--navy)]">Proctor Portal</p>
            <p className="text-sm text-[var(--muted)]">
              {period
                ? [period.semester.name, period.currentWeek?.label]
                    .filter(Boolean)
                    .join(" · ")
                : "No active semester"}
            </p>
          </div>
        </div>
        <Link
          href="/member"
          className="font-semibold text-[var(--navy)] hover:underline"
        >
          Member home
        </Link>
      </header>
      {params.status && statusMessages[params.status] && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-[var(--success-soft)] p-4 font-semibold text-[var(--success)]"
        >
          {statusMessages[params.status]}
        </p>
      )}
      {params.error && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-[var(--danger-soft)] p-4 font-semibold text-[var(--danger)]"
        >
          We couldn’t save that study-session change. Nothing was altered.
          Confirm the session belongs to an editable week and try again.
        </p>
      )}
      <h1 className="mb-2 text-4xl font-bold text-[var(--navy)]">
        Study sessions
      </h1>
      <p className="mb-7 text-[var(--muted)]">
        Proctors see only sessions they recorded. Chair and Admin accounts may
        make audited corrections to chapter sessions.
      </p>
      <ProctorSessionLogger
        members={members}
        weekId={period?.currentWeek?.id ?? null}
        weekLabel={period?.currentWeek?.label ?? "No current week"}
        currentWeekStartsOn={period?.currentWeek?.startsOn ?? null}
        currentWeekEndsOn={period?.currentWeek?.endsOn ?? null}
        initialSessions={sessions}
        canCorrectAll={canCorrectAll}
      />
    </main>
  );
}
