import { describe, expect, it } from "vitest";
import {
  calculateSemesterGPA,
  DEFAULT_PERCENTAGE_SCALE,
  percentageToGrade,
} from "@/lib/domain/grading";

describe("percentage grading", () => {
  it.each([
    [92.4, "A", 4],
    [87.8, "B", 3],
    [70, "C", 2],
    [60, "D", 1],
    [59.9, "F", 0],
  ] as const)(
    "converts %s using the standard scale",
    (value, letter, points) => {
      expect(percentageToGrade(value, DEFAULT_PERCENTAGE_SCALE)).toEqual({
        letter,
        gradePoints: points,
      });
    },
  );

  it("supports a snapshotted custom scale", () => {
    const scale = DEFAULT_PERCENTAGE_SCALE.map((band) =>
      band.letter === "A"
        ? { ...band, minimum: 93 }
        : band.letter === "B"
          ? { ...band, minimum: 85 }
          : band,
    );
    expect(percentageToGrade(91, scale)).toEqual({
      letter: "B",
      gradePoints: 3,
    });
  });
});

describe("estimated semester GPA", () => {
  const courses = [
    {
      courseId: "math",
      creditHours: 4,
      gradePoints: 4,
      includedInGpa: true,
      active: true,
    },
    {
      courseId: "history",
      creditHours: 2,
      gradePoints: 2,
      includedInGpa: true,
      active: true,
    },
    {
      courseId: "seminar",
      creditHours: 1,
      gradePoints: null,
      includedInGpa: false,
      active: true,
    },
    {
      courseId: "archived",
      creditHours: 3,
      gradePoints: 0,
      includedInGpa: true,
      active: false,
    },
  ];

  it("uses credit-hour weighting by default and excludes non-GPA and archived courses", () => {
    expect(calculateSemesterGPA(courses)).toEqual({
      estimatedGpa: 3.33,
      includedCourseCount: 2,
      excludedCourseCount: 1,
      includedCredits: 6,
    });
  });

  it("supports equal-course weighting", () => {
    expect(calculateSemesterGPA(courses, "equal").estimatedGpa).toBe(3);
  });

  it("does not fabricate a result when no course is eligible", () => {
    expect(
      calculateSemesterGPA([
        {
          courseId: "pf",
          creditHours: 3,
          gradePoints: null,
          includedInGpa: false,
          active: true,
        },
      ]).estimatedGpa,
    ).toBeNull();
  });
});
