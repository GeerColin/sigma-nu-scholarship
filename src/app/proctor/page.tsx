import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { DemoBanner } from "@/components/demo-banner";
import { ProctorSessionLogger } from "@/features/study-hours/proctor-session-logger";
import { getCurrentUserContext } from "@/lib/auth/context";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const demoMembers = [
  { memberId: "50000000-0000-4000-8000-000000000001", fullName: "Alex Morgan" },
  { memberId: "50000000-0000-4000-8000-000000000002", fullName: "Cameron Lee" },
  {
    memberId: "50000000-0000-4000-8000-000000000003",
    fullName: "Riley Bennett",
  },
];
const demoSessions = [
  {
    id: "51000000-0000-4000-8000-000000000001",
    memberName: "Alex Morgan",
    date: "2026-09-06",
    durationMinutes: 90,
    notes: "Library",
  },
];

export default async function ProctorPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const params = await searchParams;
  let members = demoMembers;
  let sessions = demoSessions;
  let weekId = "52000000-0000-4000-8000-000000000001";
  let weekLabel = "Fall 2026 · Week 5";
  if (!isDemoMode) {
    const context = await getCurrentUserContext();
    if (!context) redirect("/login");
    if (
      !context.roles.includes("proctor") &&
      !context.roles.includes("admin") &&
      !context.roles.includes("scholarship_chair")
    )
      redirect("/member");
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: directory }, { data: week }] = await Promise.all([
      supabase.rpc("list_active_members_for_proctor"),
      supabase
        .from("academic_weeks")
        .select("id, label")
        .lte("starts_on", today)
        .gte("ends_on", today)
        .maybeSingle(),
    ]);
    if (!week) throw new Error("No academic week is configured for today.");
    weekId = week.id;
    weekLabel = week.label;
    members = (
      (directory ?? []) as Array<{ member_id: string; full_name: string }>
    ).map((member) => ({
      memberId: member.member_id,
      fullName: member.full_name,
    }));
    const { data: sessionRows } = await supabase
      .from("study_sessions")
      .select(
        "id, session_date, duration_minutes, notes, members!study_sessions_member_id_fkey(full_name)",
      )
      .eq("proctor_member_id", context.memberId!)
      .eq("week_id", weekId)
      .is("voided_at", null)
      .order("created_at", { ascending: false });
    sessions = (sessionRows ?? []).map((session) => ({
      id: session.id,
      memberName: (session.members as unknown as { full_name: string })
        .full_name,
      date: session.session_date,
      durationMinutes: session.duration_minutes,
      notes: session.notes,
    }));
  }
  return (
    <main className="mx-auto min-h-screen max-w-6xl p-4 sm:p-7">
      <header className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-bold text-[var(--navy)]">Proctor Portal</p>
            <p className="text-sm text-[var(--muted)]">
              Fast, private session logging
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
      {isDemoMode && <DemoBanner />}
      {params.status && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-[var(--success-soft)] p-4 font-semibold text-[var(--success)]"
        >
          Study session recorded.
        </p>
      )}
      {params.error && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-[var(--danger-soft)] p-4 font-semibold text-[var(--danger)]"
        >
          We couldn’t record that session. Nothing was saved. Please try again.
        </p>
      )}
      <h1 className="mb-2 text-4xl font-bold text-[var(--navy)]">
        Study session
      </h1>
      <p className="mb-7 text-[var(--muted)]">
        Proctors can see active member names and only the sessions they
        personally entered.
      </p>
      <ProctorSessionLogger
        members={members}
        weekId={weekId}
        weekLabel={weekLabel}
        initialSessions={sessions}
        demo={isDemoMode}
      />
    </main>
  );
}
