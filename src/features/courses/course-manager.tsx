"use client";

import { useState } from "react";
import { Archive, Plus } from "lucide-react";
import { createCourse, archiveCourse } from "@/features/courses/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export type CourseListItem = {
  id: string;
  name: string;
  creditHours: number;
  gradingType: "percentage" | "letter" | "pass_fail" | "custom";
  customDescription?: string | null;
};

const labels: Record<CourseListItem["gradingType"], string> = {
  percentage: "Percentage",
  letter: "Letter Grade",
  pass_fail: "Pass / Fail",
  custom: "Custom / Other",
};

export function CourseManager({
  initialCourses,
  demo,
}: {
  initialCourses: CourseListItem[];
  demo: boolean;
}) {
  const [courses, setCourses] = useState(initialCourses);
  const [notice, setNotice] = useState<string | null>(null);

  function demoAdd(formData: FormData) {
    const gradingType = String(
      formData.get("gradingType"),
    ) as CourseListItem["gradingType"];
    setCourses((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: String(formData.get("name")),
        creditHours: Number(formData.get("creditHours")),
        gradingType,
        customDescription: String(formData.get("customDescription") ?? ""),
      },
    ]);
    setNotice("Course added to this development demo.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Active courses
          </h2>
        </CardHeader>
        <div className="divide-y">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"
            >
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
              {course.gradingType === "custom" && (
                <Badge tone="warning">Review may be needed</Badge>
              )}
              {demo ? (
                <Button
                  aria-label={`Archive ${course.name}`}
                  onClick={() => {
                    setCourses((current) =>
                      current.filter((item) => item.id !== course.id),
                    );
                    setNotice(
                      `${course.name} was archived in this development demo.`,
                    );
                  }}
                  className="bg-transparent text-[var(--danger)] shadow-none ring-1 ring-[var(--border)] hover:bg-[var(--danger-soft)]"
                >
                  <Archive className="mr-2 size-4" />
                  Archive
                </Button>
              ) : (
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
              )}
            </div>
          ))}
          {courses.length === 0 && (
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
          {notice && (
            <p
              role="status"
              className="mb-4 rounded-xl bg-[var(--success-soft)] p-3 text-sm font-semibold text-[var(--success)]"
            >
              {notice}
            </p>
          )}
          <form action={demo ? demoAdd : createCourse} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block font-semibold">Course name</span>
              <input
                name="name"
                required
                maxLength={160}
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
                className="min-h-11 w-full rounded-xl border px-3"
                defaultValue="3"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-semibold">Grading type</span>
              <select
                name="gradingType"
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
                Custom grading description{" "}
                <span className="font-normal text-[var(--muted)]">
                  (when applicable)
                </span>
              </span>
              <textarea
                name="customDescription"
                maxLength={500}
                rows={3}
                className="w-full rounded-xl border p-3"
                placeholder="Describe how this course is graded"
              />
            </label>
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
