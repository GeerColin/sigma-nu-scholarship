import {
  gradeCheckStatus,
  type GradeCheckStatus,
} from "@/lib/domain/grade-checks";
import {
  calculateCompletedStudyMinutes,
  type StudySessionSnapshot,
} from "@/lib/domain/study-hours";

export type StudyHourProgress = {
  requiredMinutes: number | null;
  completedMinutes: number;
  shortfallMinutes: number | null;
  status: "incomplete" | "complete" | "not_required" | "not_assigned";
};

function assignmentMinutes(finalHours: number | string): number {
  const invalidRequirement = () =>
    new Error(
      "Final study-hour requirement must be a nonnegative whole number of minutes.",
    );
  if (typeof finalHours === "string") {
    // Database decimal strings can be checked exactly, without float rounding.
    const value = finalHours.trim();
    if (!/^\d+(?:\.\d+)?$/.test(value)) throw invalidRequirement();
    const [whole = "", fraction = ""] = value.split(".");
    const scale = 10n ** BigInt(fraction.length);
    const minutes = (BigInt(whole) * scale + BigInt(fraction || "0")) * 60n;
    if (minutes % scale !== 0n) throw invalidRequirement();
    const exactMinutes = minutes / scale;
    if (exactMinutes > BigInt(Number.MAX_SAFE_INTEGER))
      throw invalidRequirement();
    return Number(exactMinutes);
  }
  const minutes = finalHours * 60;
  const roundedMinutes = Math.round(minutes);
  const floatingPointTolerance =
    Number.EPSILON * Math.max(1, Math.abs(minutes)) * 4;
  if (
    !Number.isFinite(finalHours) ||
    finalHours < 0 ||
    (finalHours > 0 && roundedMinutes === 0) ||
    !Number.isSafeInteger(roundedMinutes) ||
    Math.abs(minutes - roundedMinutes) > floatingPointTolerance
  ) {
    throw invalidRequirement();
  }
  return roundedMinutes;
}

export type HistoricalSubmissionStatus =
  GradeCheckStatus | "eligibility_unknown";

export function historicalSubmissionStatus(
  input: Parameters<typeof gradeCheckStatus>[0] & { historical: boolean },
): HistoricalSubmissionStatus {
  if (input.historical && input.required && !input.submitted) {
    // Today's roster does not prove who was required to submit in a past week.
    return "eligibility_unknown";
  }
  return gradeCheckStatus(input);
}

export function studyHourProgress(
  finalHours: number | string | null,
  sessions: readonly StudySessionSnapshot[],
): StudyHourProgress {
  const completedMinutes = calculateCompletedStudyMinutes(sessions);
  if (finalHours === null) {
    return {
      requiredMinutes: null,
      completedMinutes,
      shortfallMinutes: null,
      status: "not_assigned",
    };
  }
  const requiredMinutes = assignmentMinutes(finalHours);
  return {
    requiredMinutes,
    completedMinutes,
    shortfallMinutes: Math.max(requiredMinutes - completedMinutes, 0),
    status:
      requiredMinutes === 0
        ? "not_required"
        : completedMinutes >= requiredMinutes
          ? "complete"
          : "incomplete",
  };
}
