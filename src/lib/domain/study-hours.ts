import { z } from "zod";

export const studyHourBandSchema = z.object({
  minimumGpa: z.number().min(0).max(4).nullable(),
  maximumGpa: z.number().min(0).max(4),
  baseHours: z.number().int().min(0).max(24),
});

export type StudyHourBand = z.infer<typeof studyHourBandSchema>;

export type StudyHourRuleSet = {
  bands: StudyHourBand[];
  dAdjustmentHours: number;
  fAdjustmentHours: number;
  maximumHours: number;
};

export const DEFAULT_STUDY_HOUR_RULES: StudyHourRuleSet = {
  bands: [
    { minimumGpa: 3.5, maximumGpa: 4, baseHours: 1 },
    { minimumGpa: 3, maximumGpa: 3.49, baseHours: 1 },
    { minimumGpa: 2.75, maximumGpa: 2.99, baseHours: 2 },
    { minimumGpa: 2.5, maximumGpa: 2.74, baseHours: 2 },
    { minimumGpa: 2.25, maximumGpa: 2.49, baseHours: 3 },
    { minimumGpa: 2, maximumGpa: 2.24, baseHours: 4 },
    { minimumGpa: null, maximumGpa: 1.99, baseHours: 5 },
  ],
  dAdjustmentHours: 1,
  fAdjustmentHours: 2,
  maximumHours: 5,
};

export type StudyHourRequirementInput = {
  estimatedGpa: number;
  hasD: boolean;
  hasF: boolean;
  rules?: StudyHourRuleSet;
};

export function calculateStudyHourRequirement({
  estimatedGpa,
  hasD,
  hasF,
  rules = DEFAULT_STUDY_HOUR_RULES,
}: StudyHourRequirementInput) {
  if (!Number.isFinite(estimatedGpa) || estimatedGpa < 0 || estimatedGpa > 4)
    throw new Error("Estimated GPA must be between 0 and 4.");
  const band = rules.bands.find(
    (candidate) =>
      estimatedGpa <= candidate.maximumGpa &&
      (candidate.minimumGpa === null || estimatedGpa >= candidate.minimumGpa),
  );
  if (!band) throw new Error("Study-hour rules do not cover this GPA.");
  const riskAdjustmentHours = hasF
    ? rules.fAdjustmentHours
    : hasD
      ? rules.dAdjustmentHours
      : 0;
  const uncappedHours = band.baseHours + riskAdjustmentHours;
  return {
    baseHours: band.baseHours,
    riskAdjustmentHours,
    uncappedHours,
    finalHours: Math.min(uncappedHours, rules.maximumHours),
  };
}

export type StudySessionSnapshot = {
  durationMinutes: number;
  voided?: boolean;
};

export function calculateCompletedStudyMinutes(
  sessions: readonly StudySessionSnapshot[],
) {
  return sessions.reduce((total, session) => {
    if (session.voided) return total;
    if (
      !Number.isInteger(session.durationMinutes) ||
      session.durationMinutes <= 0
    )
      throw new Error(
        "Study-session duration must be a positive integer number of minutes.",
      );
    return total + session.durationMinutes;
  }, 0);
}

export function resolveAssignmentHours(
  automaticHours: number,
  overrideHours: number | null,
) {
  if (!Number.isInteger(automaticHours) || automaticHours < 0)
    throw new Error("Automatic hours must be a nonnegative integer.");
  if (
    overrideHours !== null &&
    (!Number.isInteger(overrideHours) || overrideHours < 0)
  )
    throw new Error("Override hours must be a nonnegative integer.");
  return overrideHours ?? automaticHours;
}

export function evaluateFrozenAssignment(
  currentHours: number,
  recalculatedHours: number,
  frozen: boolean,
) {
  if (!frozen || currentHours === recalculatedHours)
    return {
      finalHours: recalculatedHours,
      reviewRequired: false as const,
      proposedHours: null,
    };
  return {
    finalHours: currentHours,
    reviewRequired: true as const,
    proposedHours: recalculatedHours,
  };
}
