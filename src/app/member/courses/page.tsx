import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { DemoBanner } from "@/components/demo-banner";
import {
  CourseManager,
  type CourseListItem,
} from "@/features/courses/course-manager";
import { getCurrentUserContext } from "@/lib/auth/context";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const demoCourses: CourseListItem[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    name: "Calculus II",
    creditHours: 4,
    gradingType: "percentage",
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    name: "Chemistry",
    creditHours: 4,
    gradingType: "letter",
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    name: "Great Books",
    creditHours: 3,
    gradingType: "pass_fail",
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    name: "Engineering Seminar",
    creditHours: 1,
    gradingType: "custom",
    customDescription: "Satisfactory / Unsatisfactory",
  },
];

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const params = await searchParams;
  let courses = demoCourses;
  if (!isDemoMode) {
    const context = await getCurrentUserContext();
    if (!context) redirect("/login");
    if (!context.memberId) redirect("/request-access");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("courses")
      .select(
        "id, name, credit_hours, grading_type, custom_grading_description",
      )
      .eq("member_id", context.memberId)
      .is("archived_at", null)
      .order("created_at");
    if (error) throw new Error("Could not load courses.");
    courses = (data ?? []).map((course) => ({
      id: course.id,
      name: course.name,
      creditHours: Number(course.credit_hours),
      gradingType: course.grading_type,
      customDescription: course.custom_grading_description,
    })) as CourseListItem[];
  }
  return (
    <main className="mx-auto min-h-screen max-w-6xl p-4 sm:p-7">
      <header className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-bold text-[var(--navy)]">My Courses</p>
            <p className="text-sm text-[var(--muted)]">Fall 2026</p>
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
          Course {params.status}.
        </p>
      )}
      {params.error && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-[var(--danger-soft)] p-4 font-semibold text-[var(--danger)]"
        >
          We couldn’t save that change. Nothing was altered. Please try again.
        </p>
      )}
      <div className="mb-7">
        <h1 className="text-4xl font-bold text-[var(--navy)]">Courses</h1>
        <p className="mt-2 text-[var(--muted)]">
          Set these up once per semester. Archived courses stay in your academic
          history.
        </p>
      </div>
      <CourseManager initialCourses={courses} demo={isDemoMode} />
    </main>
  );
}
