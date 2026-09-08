import { Archive, Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  archiveCourse,
  createCourse,
  updateCourse,
} from "@/features/courses/actions";

export type CourseListItem = {
  id: string;
  name: string;
  creditHours: number;
  gradingType: "percentage" | "letter" | "pass_fail" | "custom";
  customDescription?: string | null;
  scaleMinimums?: {
    a: number;
    b: number;
    c: number;
    d: number;
  } | null;
};

const labels: Record<CourseListItem["gradingType"], string> = {
  percentage: "Percentage",
  letter: "Letter Grade",
  pass_fail: "Pass / Fail",
  custom: "Custom / Other",
};

function CourseFields({ course }: { course?: CourseListItem }) {
  const scale = course?.scaleMinimums;
  return (
    <>
      <label className="block">
        <span className="mb-1.5 block font-semibold">Course name</span>
        <input
          name="name"
          required
          maxLength={160}
          defaultValue={course?.name}
          className="min-h-11 w-full rounded-xl border px-3"
          placeholder="e.g. Calculus II"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block font-semibold">Credit hours</span>
        <input
          name="creditHours"
          required
          type="number"
          min="0.25"
          max="24"
          step="0.25"
          defaultValue={course?.creditHours ?? 3}
          className="min-h-11 w-full rounded-xl border px-3"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block font-semibold">Grading type</span>
        <select
          name="gradingType"
          defaultValue={course?.gradingType ?? "percentage"}
          className="min-h-11 w-full rounded-xl border bg-white px-3"
        >
          <option value="percentage">Percentage</option>
          <option value="letter">Letter Grade</option>
          <option value="pass_fail">Pass / Fail</option>
          <option value="custom">Custom / Other</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block font-semibold">
          Custom / Other description{" "}
          <span className="font-normal text-[var(--muted)]">
            (required for Custom / Other)
          </span>
        </span>
        <textarea
          name="customDescription"
          maxLength={500}
          rows={2}
          defaultValue={course?.customDescription ?? ""}
          className="w-full rounded-xl border p-3"
          placeholder="Describe how this course is graded"
        />
      </label>
      <div className="rounded-xl bg-[var(--surface-subtle)] p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="useCustomScale"
            defaultChecked={Boolean(scale)}
            className="mt-1 size-4"
          />
          <span>
            <span className="block font-semibold">
              Use a course-specific percentage scale
            </span>
            <span className="text-sm text-[var(--muted)]">
              Leave unchecked to use the default 90/80/70/60 scale.
            </span>
          </span>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["A", "percentageAMin", scale?.a ?? 90],
              ["B", "percentageBMin", scale?.b ?? 80],
              ["C", "percentageCMin", scale?.c ?? 70],
              ["D", "percentageDMin", scale?.d ?? 60],
            ] as const
          ).map(([letter, name, value]) => (
            <label key={letter}>
              <span className="mb-1 block text-sm font-semibold">
                {letter} minimum
              </span>
              <input
                name={name}
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue={value}
                className="min-h-11 w-full rounded-xl border px-3"
              />
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

export function CourseManager({
  initialCourses,
}: {
  initialCourses: CourseListItem[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Active courses
          </h2>
        </CardHeader>
        <div className="divide-y">
          {initialCourses.map((course) => (
            <article key={course.id} className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[var(--navy)]">{course.name}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {course.creditHours} credit
                    {course.creditHours === 1 ? "" : "s"} ·{" "}
                    {labels[course.gradingType]}
                  </p>
                  {course.customDescription && (
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {course.customDescription}
                    </p>
                  )}
                </div>
                {course.scaleMinimums && <Badge>Course-specific scale</Badge>}
                {course.gradingType === "custom" && (
                  <Badge tone="warning">Review may be needed</Badge>
                )}
                <form action={archiveCourse}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <Button
                    type="submit"
                    className="bg-transparent text-[var(--danger)] shadow-none ring-1 ring-[var(--border)] hover:bg-[var(--danger-soft)]"
                  >
                    <Archive className="mr-2 size-4" />
                    Archive
                  </Button>
                </form>
              </div>
              <details className="mt-4 rounded-xl border">
                <summary className="cursor-pointer p-3 font-semibold text-[var(--navy)]">
                  Edit course setup
                </summary>
                <form action={updateCourse} className="space-y-4 border-t p-4">
                  <input type="hidden" name="courseId" value={course.id} />
                  <CourseFields course={course} />
                  <Button type="submit">
                    <Save className="mr-2 size-4" />
                    Save course
                  </Button>
                </form>
              </details>
            </article>
          ))}
          {initialCourses.length === 0 && (
            <p className="p-8 text-center text-[var(--muted)]">
              No active courses. Add your first course to begin weekly
              check-ins.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">Add a course</h2>
        </CardHeader>
        <CardContent>
          <form action={createCourse} className="space-y-4">
            <CourseFields />
            <Button type="submit" className="w-full">
              <Plus className="mr-2 size-4" />
              Add course
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
