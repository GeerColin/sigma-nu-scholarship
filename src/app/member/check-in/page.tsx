import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { DemoBanner } from "@/components/demo-banner";
import {
  WeeklyCheckInForm,
  type CheckInCourse,
} from "@/features/grades/weekly-check-in-form";
import { getCurrentUserContext } from "@/lib/auth/context";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const demoWeekId = "40000000-0000-4000-8000-000000000001";
const demoCourses: CheckInCourse[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    name: "Calculus II",
    gradingType: "percentage",
    previousValue: 92.4,
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    name: "Chemistry",
    gradingType: "letter",
    previousValue: "B",
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    name: "Great Books",
    gradingType: "pass_fail",
    previousValue: "Pass",
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    name: "Engineering Seminar",
    gradingType: "custom",
    previousValue: "Satisfactory",
  },
];

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const params = await searchParams;
  let weekId = demoWeekId;
  let courses = demoCourses;
  if (!isDemoMode) {
    const context = await getCurrentUserContext();
    if (!context) redirect("/login");
    if (!context.memberId) redirect("/request-access");
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data: week } = await supabase
      .from("academic_weeks")
      .select("id, semester_id")
      .lte("starts_on", today)
      .gte("ends_on", today)
      .maybeSingle();
    if (!week) throw new Error("No academic week is configured for today.");
    weekId = week.id;
    const [{ data: courseRows }, { data: latest }] = await Promise.all([
      supabase
        .from("courses")
        .select("id, name, grading_type")
        .eq("member_id", context.memberId)
        .eq("semester_id", week.semester_id)
        .is("archived_at", null)
        .order("created_at"),
      supabase
        .from("grade_submissions")
        .select("grade_entries(course_id, reported_value)")
        .eq("member_id", context.memberId)
        .eq("is_current", true)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const previous = new Map(
      (
        (latest?.grade_entries ?? []) as Array<{
          course_id: string;
          reported_value: string | number;
        }>
      ).map((entry) => [entry.course_id, entry.reported_value]),
    );
    courses = (courseRows ?? []).map((course) => ({
      id: course.id,
      name: course.name,
      gradingType: course.grading_type,
      previousValue: previous.get(course.id) ?? null,
    })) as CheckInCourse[];
  }
  return (
    <main className="mx-auto min-h-screen max-w-4xl p-4 sm:p-7">
      <header className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-bold text-[var(--navy)]">Weekly Check-In</p>
            <p className="text-sm text-[var(--muted)]">Fall 2026 · Week 5</p>
          </div>
        </div>
        <Link
          href="/member"
          className="font-semibold text-[var(--navy)] hover:underline"
        >
          Home
        </Link>
      </header>
      {isDemoMode && <DemoBanner />}
      {params.status && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-[var(--success-soft)] p-4 font-semibold text-[var(--success)]"
        >
          Your weekly check-in was recorded. A revision will never overwrite the
          prior submission.
        </p>
      )}
      {params.error && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-[var(--danger-soft)] p-4 font-semibold text-[var(--danger)]"
        >
          We couldn’t submit your grades. Your submission has not been recorded.
          Please try again.
        </p>
      )}
      <h1 className="text-4xl font-bold text-[var(--navy)]">
        Report this week’s grades
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        We copied your latest values. Only change what is different.
      </p>
      <div className="mt-7">
        <WeeklyCheckInForm
          weekId={weekId}
          courses={courses}
          demo={isDemoMode}
        />
      </div>
    </main>
  );
}
