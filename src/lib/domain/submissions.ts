export type SubmissionTiming = "on_time" | "late";

export function submissionStatusLabel(
  originalTiming: SubmissionTiming,
  latestRevisionTiming: SubmissionTiming,
  revisionNumber = 1,
) {
  if (originalTiming === "late") return "Submitted late";
  if (revisionNumber > 1 && latestRevisionTiming === "late") {
    return "Submitted on time \u2014 edited after deadline";
  }
  return "Submitted on time";
}

export type SubmissionStatus = {
  originalTiming: SubmissionTiming;
  latestRevisionTiming: SubmissionTiming;
  editedAfterDeadline: boolean;
  displayLabel:
    | "Submitted on time"
    | "Submitted on time — edited after deadline"
    | "Submitted late";
};

export function determineSubmissionStatus(
  originalSubmittedAt: Date,
  latestSubmittedAt: Date,
  deadline: Date,
): SubmissionStatus {
  const originalTiming =
    originalSubmittedAt.getTime() <= deadline.getTime() ? "on_time" : "late";
  const latestRevisionTiming =
    latestSubmittedAt.getTime() <= deadline.getTime() ? "on_time" : "late";
  const editedAfterDeadline =
    originalTiming === "on_time" && latestRevisionTiming === "late";
  return {
    originalTiming,
    latestRevisionTiming,
    editedAfterDeadline,
    displayLabel:
      originalTiming === "late"
        ? "Submitted late"
        : editedAfterDeadline
          ? "Submitted on time — edited after deadline"
          : "Submitted on time",
  };
}

export type GradeObservation =
  | { type: "percentage"; value: number }
  | { type: "letter"; value: "A" | "B" | "C" | "D" | "F" }
  | { type: "non_gpa"; value: string };

export type AlertThresholds = { percentageDrop: number; letterSteps: number };

const letterRank = { A: 4, B: 3, C: 2, D: 1, F: 0 } as const;

export function detectAcademicAlert(
  previous: GradeObservation | null,
  current: GradeObservation,
  thresholds: AlertThresholds,
) {
  if (!previous || previous.type !== current.type) return null;
  if (previous.type === "percentage" && current.type === "percentage") {
    const decrease = previous.value - current.value;
    return decrease >= thresholds.percentageDrop
      ? { kind: "percentage_drop" as const, decrease }
      : null;
  }
  if (previous.type === "letter" && current.type === "letter") {
    const decrease = letterRank[previous.value] - letterRank[current.value];
    return decrease >= thresholds.letterSteps
      ? { kind: "letter_drop" as const, decrease }
      : null;
  }
  return null;
}
