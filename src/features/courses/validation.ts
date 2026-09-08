import { z } from "zod";

const baseCourseSchema = z.object({
  name: z.string().trim().min(1).max(160),
  creditHours: z.coerce.number().positive().max(24),
  gradingType: z.enum(["percentage", "letter", "pass_fail", "custom"]),
  customDescription: z.string().trim().max(500).optional(),
  useCustomScale: z.boolean(),
  percentageAMin: z.coerce.number().min(0).max(100).optional(),
  percentageBMin: z.coerce.number().min(0).max(100).optional(),
  percentageCMin: z.coerce.number().min(0).max(100).optional(),
  percentageDMin: z.coerce.number().min(0).max(100).optional(),
});

function validateCourse(
  course: z.infer<typeof baseCourseSchema>,
  context: z.RefinementCtx,
) {
  if (course.gradingType === "custom" && !course.customDescription) {
    context.addIssue({
      code: "custom",
      path: ["customDescription"],
      message: "Describe the custom grading system.",
    });
  }
  if (course.useCustomScale && course.gradingType !== "percentage") {
    context.addIssue({
      code: "custom",
      path: ["useCustomScale"],
      message: "A percentage scale requires Percentage grading.",
    });
  }
  if (course.useCustomScale) {
    const values = [
      course.percentageAMin,
      course.percentageBMin,
      course.percentageCMin,
      course.percentageDMin,
    ];
    if (
      values.some((value) => value === undefined) ||
      !(
        values[0]! > values[1]! &&
        values[1]! > values[2]! &&
        values[2]! > values[3]! &&
        values[3]! > 0
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["percentageAMin"],
        message: "Percentage thresholds must descend from A through D.",
      });
    }
  }
}

export const courseSchema = baseCourseSchema.superRefine(validateCourse);

export const updateCourseSchema = baseCourseSchema
  .extend({ courseId: z.string().uuid() })
  .superRefine(validateCourse);

export function courseScaleArguments(
  course: z.infer<typeof courseSchema> | z.infer<typeof updateCourseSchema>,
) {
  return {
    percentage_a_min: course.useCustomScale ? course.percentageAMin! : null,
    percentage_b_min: course.useCustomScale ? course.percentageBMin! : null,
    percentage_c_min: course.useCustomScale ? course.percentageCMin! : null,
    percentage_d_min: course.useCustomScale ? course.percentageDMin! : null,
  };
}
