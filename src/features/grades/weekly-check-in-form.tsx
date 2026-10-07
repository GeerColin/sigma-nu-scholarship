"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  submitWeeklyCheckIn,
  type WeeklyCheckInActionState,
} from "@/features/grades/actions";
import {
  submissionCommentSchema,
  submissionCommentWordCount,
} from "@/lib/domain/submission-comments";

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
  initialComment = null,
}: {
  weekId: string;
  courses: CheckInCourse[];
  isRevision?: boolean;
  initialComment?: string | null;
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
  const [comment, setComment] = useState(initialComment ?? "");
  const [state, formAction] = useActionState(submitWeeklyCheckIn, {});
  const [dismissedCommentState, setDismissedCommentState] =
    useState<WeeklyCheckInActionState | null>(null);
  const commentInput = useRef<HTMLTextAreaElement>(null);
  const formError = useRef<HTMLParagraphElement>(null);
  const parsedComment = submissionCommentSchema.safeParse(comment);
  const commentError = parsedComment.success
    ? state !== dismissedCommentState
      ? state.commentError
      : undefined
    : (parsedComment.error.issues[0]?.message ??
      "Check your comment and try again.");
  useEffect(() => {
    if (state.commentError) commentInput.current?.focus();
    else if (state.message) formError.current?.focus();
  }, [state]);
  const entries = courses.map((course) => ({
    courseId: course.id,
    value:
      course.gradingType === "percentage"
        ? Number(values[course.id])
        : String(values[course.id]),
  }));
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (commentError) {
          event.preventDefault();
          commentInput.current?.focus();
        }
      }}
      className="space-y-4"
    >
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
        <>
          <Card>
            <CardContent>
              <label htmlFor="submission-comment">
                <span className="block font-bold text-[var(--navy)]">
                  Anything you want to explain about these grades?
                </span>
                <span className="mt-1 block text-sm text-[var(--muted)]">
                  Optional context, such as an exam, illness, or grading
                  circumstance. This note is saved with this submission. 30
                  words maximum.
                </span>
                <textarea
                  ref={commentInput}
                  id="submission-comment"
                  name="submissionComment"
                  value={comment}
                  onChange={(event) => {
                    setComment(event.target.value);
                    setDismissedCommentState(state);
                  }}
                  maxLength={1000}
                  aria-invalid={Boolean(commentError)}
                  aria-describedby={
                    commentError
                      ? "submission-comment-count submission-comment-error"
                      : "submission-comment-count"
                  }
                  rows={4}
                  className="mt-3 w-full rounded-xl border px-3 py-3"
                  placeholder="Add a note about this week’s grades (optional)"
                />
                <span
                  id="submission-comment-count"
                  className="mt-1 block text-right text-xs text-[var(--muted)]"
                >
                  {submissionCommentWordCount(comment)}/30 words
                </span>
              </label>
              {commentError && (
                <p
                  id="submission-comment-error"
                  role="alert"
                  className="mt-2 text-sm font-semibold text-[var(--danger)]"
                >
                  {commentError}
                </p>
              )}
            </CardContent>
          </Card>
          {state.message && (
            <p
              ref={formError}
              role="alert"
              tabIndex={-1}
              className="rounded-xl bg-[var(--danger-soft)] p-4 font-semibold text-[var(--danger)]"
            >
              {state.message}
            </p>
          )}
          <SubmitButton
            pendingLabel="Submitting grades…"
            className="w-full sm:w-auto"
          >
            {isRevision ? "Save revised grades" : "Submit weekly grades"}
          </SubmitButton>
        </>
      )}
    </form>
  );
}
