"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { submitWeeklyCheckIn } from "@/features/grades/actions";

export type CheckInCourse = {
  id: string;
  name: string;
  gradingType: "percentage" | "letter" | "pass_fail" | "custom";
  previousValue: string | number | null;
};

export function WeeklyCheckInForm({
  weekId,
  courses,
  isRevision = false,
}: {
  weekId: string;
  courses: CheckInCourse[];
  isRevision?: boolean;
}) {
  const initial = useMemo(
    () =>
      Object.fromEntries(
        courses.map((course) => [course.id, course.previousValue ?? ""]),
      ),
    [courses],
  );
  const [values, setValues] =
    useState<Record<string, string | number>>(initial);
  const entries = courses.map((course) => ({
    courseId: course.id,
    value:
      course.gradingType === "percentage"
        ? Number(values[course.id])
        : String(values[course.id]),
  }));
  return (
    <form action={submitWeeklyCheckIn} className="space-y-4">
      <input type="hidden" name="weekId" value={weekId} />
      <input type="hidden" name="entries" value={JSON.stringify(entries)} />
      {courses.map((course) => (
        <Card key={course.id}>
          <CardContent className="grid gap-4 sm:grid-cols-[1fr_14rem] sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-[var(--navy)]">{course.name}</p>
                <Badge>
                  {
                    {
                      percentage: "Percentage",
                      letter: "Letter grade",
                      pass_fail: "Pass / Fail",
                      custom: "Custom",
                    }[course.gradingType]
                  }
                </Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {isRevision ? "Current submission" : "Previous week"}:{" "}
                {course.previousValue ?? "No previous value"}
                {course.gradingType === "percentage" &&
                course.previousValue !== null
                  ? "%"
                  : ""}
              </p>
            </div>
            <label>
              <span className="mb-1.5 block text-sm font-semibold">
                Current standing
              </span>
              {course.gradingType === "percentage" ? (
                <input
                  aria-label={`Current standing for ${course.name}`}
                  required
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.01"
                  value={values[course.id]}
                  onChange={(e) =>
                    setValues({ ...values, [course.id]: e.target.value })
                  }
                  className="min-h-12 w-full rounded-xl border px-3"
                />
              ) : course.gradingType === "letter" ? (
                <select
                  aria-label={`Current standing for ${course.name}`}
                  required
                  value={values[course.id]}
                  onChange={(e) =>
                    setValues({ ...values, [course.id]: e.target.value })
                  }
                  className="min-h-12 w-full rounded-xl border bg-white px-3"
                >
                  <option value="">Select</option>
                  {["A", "B", "C", "D", "F"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              ) : course.gradingType === "pass_fail" ? (
                <select
                  aria-label={`Current standing for ${course.name}`}
                  required
                  value={values[course.id]}
                  onChange={(e) =>
                    setValues({ ...values, [course.id]: e.target.value })
                  }
                  className="min-h-12 w-full rounded-xl border bg-white px-3"
                >
                  <option value="">Select</option>
                  <option>Pass</option>
                  <option>Fail</option>
                </select>
              ) : (
                <input
                  aria-label={`Current standing for ${course.name}`}
                  required
                  maxLength={500}
                  value={values[course.id]}
                  onChange={(e) =>
                    setValues({ ...values, [course.id]: e.target.value })
                  }
                  className="min-h-12 w-full rounded-xl border px-3"
                  placeholder="Describe your standing"
                />
              )}
            </label>
          </CardContent>
        </Card>
      ))}
      {courses.length > 0 && (
        <SubmitButton
          pendingLabel="Submitting grades…"
          className="w-full sm:w-auto"
        >
          {isRevision ? "Save revised grades" : "Submit weekly grades"}
        </SubmitButton>
      )}
    </form>
  );
}
