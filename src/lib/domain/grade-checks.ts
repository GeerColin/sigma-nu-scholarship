export type GradeCheckSubmissionTiming = "on_time" | "late";

export type GradeCheckStatus =
  "on_time" | "late" | "awaiting" | "missing" | "not_required";

export type GradeCheckWeekExclusion = "pre_start" | "skipped" | "future";

export type GradeCheckSubmissionSummary = {
  onTimeCount: number;
  lateCount: number;
  awaitingCount: number;
  missingCount: number;
  expectedCount: number;
};

export function gradeCheckRequiredForWeek({
  sequenceNumber,
  firstGradeCheckSequence,
  configuredRequired,
}: {
  sequenceNumber: number;
  firstGradeCheckSequence: number | null;
  configuredRequired: boolean;
}) {
  return configuredRequired && sequenceNumber >= (firstGradeCheckSequence ?? 1);
}

export function summarizeGradeCheckWeek({
  activeMemberIds,
  submissions,
  required,
  excludedReason,
  deadlineAt,
  now = new Date(),
}: {
  activeMemberIds: readonly string[];
  submissions: ReadonlyArray<{
    memberId: string;
    originalTiming?: GradeCheckSubmissionTiming | null;
  }>;
  required: boolean;
  excludedReason: GradeCheckWeekExclusion | null;
  deadlineAt: string;
  now?: Date;
}): GradeCheckSubmissionSummary {
  const effectiveRequired = required && excludedReason === null;
  const submissionByMember = new Map<
    string,
    { originalTiming?: GradeCheckSubmissionTiming | null }
  >();
  for (const submission of submissions) {
    if (!submissionByMember.has(submission.memberId)) {
      submissionByMember.set(submission.memberId, submission);
    }
  }

  const summary: GradeCheckSubmissionSummary = {
    onTimeCount: 0,
    lateCount: 0,
    awaitingCount: 0,
    missingCount: 0,
    expectedCount: effectiveRequired ? activeMemberIds.length : 0,
  };
  for (const memberId of activeMemberIds) {
    const submission = submissionByMember.get(memberId);
    const status = gradeCheckStatus({
      required: effectiveRequired,
      submitted: Boolean(submission),
      originalTiming: submission?.originalTiming,
      deadlineAt,
      now,
    });
    if (status === "on_time") summary.onTimeCount += 1;
    if (status === "late") summary.lateCount += 1;
    if (status === "awaiting") summary.awaitingCount += 1;
    if (status === "missing") summary.missingCount += 1;
  }
  return summary;
}

export function gradeCheckStatus({
  required,
  submitted,
  originalTiming,
  deadlineAt,
  now = new Date(),
}: {
  required: boolean;
  submitted: boolean;
  originalTiming?: GradeCheckSubmissionTiming | null;
  deadlineAt: string;
  now?: Date;
}): GradeCheckStatus {
  if (!required) return "not_required";
  if (submitted && originalTiming === "late") return "late";
  if (submitted) return "on_time";
  return now.getTime() > new Date(deadlineAt).getTime()
    ? "missing"
    : "awaiting";
}

export function gradeCheckStatusLabel(status: GradeCheckStatus) {
  switch (status) {
    case "on_time":
      return "On time";
    case "late":
      return "Late";
    case "awaiting":
      return "Awaiting submission";
    case "missing":
      return "Missing";
    case "not_required":
      return "No grade check required";
  }
}
