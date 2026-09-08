import { describe, expect, it } from "vitest";
import { courseSchema } from "@/features/courses/validation";

const base = {
  name: "Synthetic Calculus",
  creditHours: 4,
  gradingType: "percentage" as const,
  useCustomScale: false,
};

describe("course validation", () => {
  it("accepts all four supported grading types", () => {
    expect(courseSchema.safeParse(base).success).toBe(true);
    expect(
      courseSchema.safeParse({ ...base, gradingType: "letter" }).success,
    ).toBe(true);
    expect(
      courseSchema.safeParse({ ...base, gradingType: "pass_fail" }).success,
    ).toBe(true);
    expect(
      courseSchema.safeParse({
        ...base,
        gradingType: "custom",
        customDescription: "Satisfactory / Unsatisfactory",
      }).success,
    ).toBe(true);
  });

  it("requires a description for Custom / Other", () => {
    expect(
      courseSchema.safeParse({ ...base, gradingType: "custom" }).success,
    ).toBe(false);
  });

  it("accepts only descending course-specific percentage thresholds", () => {
    expect(
      courseSchema.safeParse({
        ...base,
        useCustomScale: true,
        percentageAMin: 93,
        percentageBMin: 85,
        percentageCMin: 77,
        percentageDMin: 70,
      }).success,
    ).toBe(true);
    expect(
      courseSchema.safeParse({
        ...base,
        useCustomScale: true,
        percentageAMin: 90,
        percentageBMin: 92,
        percentageCMin: 70,
        percentageDMin: 60,
      }).success,
    ).toBe(false);
  });
});
