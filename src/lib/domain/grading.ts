import { z } from "zod";

export const weightingModeSchema = z.enum(["credit_hours", "equal"]);
export type WeightingMode = z.infer<typeof weightingModeSchema>;

export const letterGradeSchema = z.enum(["A", "B", "C", "D", "F"]);
export type LetterGrade = z.infer<typeof letterGradeSchema>;

export const percentageScaleSchema = z
  .array(
    z.object({
      letter: letterGradeSchema,
      minimum: z.number().min(0).max(100),
      gradePoints: z.number().min(0).max(4),
    }),
  )
  .length(5)
  .superRefine((bands, context) => {
    const letters = new Set(bands.map((band) => band.letter));
    if (letters.size !== 5)
      context.addIssue({
        code: "custom",
        message: "Scale must define A, B, C, D, and F exactly once.",
      });
    const descending = [...bands].sort((a, b) => b.minimum - a.minimum);
    if (
      descending.some(
        (band, index) =>
          index > 0 && band.minimum >= descending[index - 1]!.minimum,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Scale minimums must be unique.",
      });
    }
  });

export type PercentageScale = z.infer<typeof percentageScaleSchema>;

export const DEFAULT_PERCENTAGE_SCALE: PercentageScale = [
  { letter: "A", minimum: 90, gradePoints: 4 },
  { letter: "B", minimum: 80, gradePoints: 3 },
  { letter: "C", minimum: 70, gradePoints: 2 },
  { letter: "D", minimum: 60, gradePoints: 1 },
  { letter: "F", minimum: 0, gradePoints: 0 },
];

export const LETTER_GRADE_POINTS: Record<LetterGrade, number> = {
  A: 4,
  B: 3,
  C: 2,
  D: 1,
  F: 0,
};

export function percentageToGrade(
  percentage: number,
  scale: PercentageScale = DEFAULT_PERCENTAGE_SCALE,
) {
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)
    throw new Error("Percentage must be between 0 and 100.");
  const validScale = percentageScaleSchema.parse(scale);
  const band = [...validScale]
    .sort((a, b) => b.minimum - a.minimum)
    .find((candidate) => percentage >= candidate.minimum);
  if (!band)
    throw new Error("The grading scale does not cover this percentage.");
  return { letter: band.letter, gradePoints: band.gradePoints };
}

export type GpaCourseSnapshot = {
  courseId: string;
  creditHours: number;
  gradePoints: number | null;
  includedInGpa: boolean;
  active: boolean;
};

export type SemesterGpaResult = {
  estimatedGpa: number | null;
  includedCourseCount: number;
  excludedCourseCount: number;
  includedCredits: number;
};

export function calculateSemesterGPA(
  courses: readonly GpaCourseSnapshot[],
  mode: WeightingMode = "credit_hours",
): SemesterGpaResult {
  const validMode = weightingModeSchema.parse(mode);
  const active = courses.filter((course) => course.active);
  const included = active.filter(
    (course) =>
      course.includedInGpa &&
      course.gradePoints !== null &&
      Number.isFinite(course.gradePoints) &&
      course.creditHours > 0,
  );
  if (included.length === 0) {
    return {
      estimatedGpa: null,
      includedCourseCount: 0,
      excludedCourseCount: active.length,
      includedCredits: 0,
    };
  }
  const includedCredits = included.reduce(
    (total, course) => total + course.creditHours,
    0,
  );
  const numerator = included.reduce(
    (total, course) =>
      total +
      course.gradePoints! *
        (validMode === "credit_hours" ? course.creditHours : 1),
    0,
  );
  const denominator =
    validMode === "credit_hours" ? includedCredits : included.length;
  return {
    estimatedGpa: Math.round((numerator / denominator) * 100) / 100,
    includedCourseCount: included.length,
    excludedCourseCount: active.length - included.length,
    includedCredits,
  };
}
