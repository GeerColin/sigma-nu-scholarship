"use client";

import { useState } from "react";
import { Archive, Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
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
  const [gradingType, setGradingType] = useState<CourseListItem["gradingType"]>(
    course?.gradingType ?? "percentage",
  );
  const [useCustomScale, setUseCustomScale] = useState(Boolean(scale));
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
          value={gradingType}
          onChange={(event) =>
            setGradingType(event.target.value as CourseListItem["gradingType"])
          }
          className="min-h-11 w-full rounded-xl border bg-white px-3"
        >
          <option value="percentage">Percentage</option>
          <option value="letter">Letter Grade</option>
          <option value="pass_fail">Pass / Fail</option>
          <option value="custom">Custom / Other</option>
        </select>
      </label>
      <p className="-mt-2 text-sm text-[var(--muted)]">
        {
          {
            percentage: "Enter a number from 0 to 100 during weekly check-ins.",
            letter: "Choose A, B, C, D, or F during weekly check-ins.",
            pass_fail: "Choose Pass or Fail during weekly check-ins.",
            custom:
              "Describe the grading system and report a short status each week.",
          }[gradingType]
        }
      </p>
      {gradingType === "custom" && (
        <label className="block">
          <span className="mb-1.5 block font-semibold">
            Describe the grading system
          </span>
          <textarea
            name="customDescription"
            required
            maxLength={500}
            rows={2}
            defaultValue={course?.customDescription ?? ""}
            className="w-full rounded-xl border p-3"
            placeholder="For example: satisfactory progress based on instructor feedback"
          />
        </label>
      )}
      {gradingType === "percentage" && (
        <div className="rounded-xl bg-[var(--surface-subtle)] p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="useCustomScale"
              checked={useCustomScale}
              onChange={(event) => setUseCustomScale(event.target.checked)}
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
          {useCustomScale && (
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
          )}
        </div>
      )}
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
                <details className="rounded-xl border">
                  <summary className="min-h-11 cursor-pointer list-none px-4 py-2.5 font-semibold text-[var(--danger)]">
                    Archive
                  </summary>
                  <form
                    action={archiveCourse}
                    className="space-y-3 border-t p-3"
                  >
                    <input type="hidden" name="courseId" value={course.id} />
                    <p className="max-w-xs text-sm text-[var(--muted)]">
                      This removes the course from future check-ins. Existing
                      history stays available.
                    </p>
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" required className="mt-1" />
                      <span>I understand this course will be archived.</span>
                    </label>
                    <SubmitButton
                      type="submit"
                      className="w-full bg-[var(--danger)] hover:bg-[var(--danger)]"
                    >
                      <Archive className="mr-2 size-4" />
                      Archive course
                    </SubmitButton>
                  </form>
                </details>
              </div>
              <details className="mt-4 rounded-xl border">
                <summary className="cursor-pointer p-3 font-semibold text-[var(--navy)]">
                  Edit course setup
                </summary>
                <form action={updateCourse} className="space-y-4 border-t p-4">
                  <input type="hidden" name="courseId" value={course.id} />
                  <CourseFields course={course} />
                  <SubmitButton type="submit">
                    <Save className="mr-2 size-4" />
                    Save course
                  </SubmitButton>
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
            <SubmitButton type="submit" className="w-full">
              <Plus className="mr-2 size-4" />
              Add course
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
