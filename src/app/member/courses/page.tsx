import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Card, CardContent } from "@/components/ui/card";
import {
  CourseManager,
  type CourseListItem,
} from "@/features/courses/course-manager";
import { getActiveAcademicPeriod } from "@/lib/academic/calendar";
import { requireApprovedMemberContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

function scaleMinimums(value: unknown): CourseListItem["scaleMinimums"] {
  if (!Array.isArray(value)) return null;
  const minimum = (letter: string) => {
    const band = value.find(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "letter" in item &&
        item.letter === letter,
    );
    return band && "minimum" in band ? Number(band.minimum) : Number.NaN;
  };
  const result = {
    a: minimum("A"),
    b: minimum("B"),
    c: minimum("C"),
    d: minimum("D"),
  };
  return Object.values(result).every(Number.isFinite) ? result : null;
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const params = await searchParams;
  const context = await requireApprovedMemberContext();
  const period = await getActiveAcademicPeriod(context.chapterId!);
  const supabase = await createClient();
  let courses: CourseListItem[] = [];

  if (period) {
    const { data, error } = await supabase
      .from("courses")
      .select(
        "id, name, credit_hours, grading_type, custom_grading_description, grading_scales(scale)",
      )
      .eq("member_id", context.memberId!)
      .eq("semester_id", period.semester.id)
      .is("archived_at", null)
      .order("created_at");
    if (error) throw new Error("Could not load courses.");
    courses = (data ?? []).map((course) => {
      const scale = course.grading_scales as unknown as {
        scale: unknown;
      } | null;
      return {
        id: course.id,
        name: course.name,
        creditHours: Number(course.credit_hours),
        gradingType: course.grading_type,
        customDescription: course.custom_grading_description,
        scaleMinimums: scaleMinimums(scale?.scale),
      };
    }) as CourseListItem[];
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-4 sm:p-7">
      <header className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-bold text-[var(--navy)]">My Courses</p>
            <p className="text-sm text-[var(--muted)]">
              {period?.semester.name ?? "No active semester"}
            </p>
          </div>
        </div>
        <Link
          href="/member"
          className="font-semibold text-[var(--navy)] hover:underline"
        >
          Home
        </Link>
      </header>
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
          We couldn’t save that change. Nothing was altered. Check the course
          setup and try again.
        </p>
      )}
      <div className="mb-7">
        <h1 className="text-4xl font-bold text-[var(--navy)]">Courses</h1>
        <p className="mt-2 text-[var(--muted)]">
          Configure courses for the active semester. Archived courses and prior
          grade snapshots remain in academic history.
        </p>
      </div>

      {period ? (
        <CourseManager initialCourses={courses} />
      ) : (
        <Card>
          <CardContent>
            <p className="font-bold text-[var(--navy)]">
              No active semester configured.
            </p>
            <p className="mt-2 text-[var(--muted)]">
              The Scholarship Chair or an Admin must configure a semester before
              courses can be added.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
