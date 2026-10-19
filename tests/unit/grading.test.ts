import { describe, expect, it } from "vitest";
import {
  calculateSemesterGPA,
  DEFAULT_PERCENTAGE_SCALE,
  letterGradeSchema,
  letterToGrade,
  percentageScaleSchema,
  percentageToGrade,
} from "@/lib/domain/grading";

describe("letter-only plus grade scale", () => {
  it.each([
    ["A", 4],
    ["B+", 3.5],
    ["B", 3],
    ["C+", 2.5],
    ["C", 2],
    ["D+", 1.5],
    ["D", 1],
    ["F", 0],
  ] as const)("maps %s to exactly %s grade points", (letter, gradePoints) => {
    expect(letterToGrade(letter)).toEqual({ letter, gradePoints });
  });

  it.each(["A+", "F+", "A-", "B-", "C-", "D-", "F-", "E", "B++", ""])(
    "rejects unsupported %j",
    (letter) => {
      expect(letterGradeSchema.safeParse(letter).success).toBe(false);
    },
  );

  it("normalizes supported letter inputs consistently with the authenticated RPC", () => {
    expect(letterToGrade(" b+ ")).toEqual({ letter: "B+", gradePoints: 3.5 });
  });

  it("does not let a plus grade enter the five-band percentage schema", () => {
    expect(
      percentageScaleSchema.safeParse(
        DEFAULT_PERCENTAGE_SCALE.map((band) =>
          band.letter === "B"
            ? { ...band, letter: "B+", gradePoints: 3.5 }
            : band,
        ),
      ).success,
    ).toBe(false);
    expect(percentageToGrade(89.9)).toEqual({ letter: "B", gradePoints: 3 });
  });

  it.each([
    ["credit_hours", 3.63],
    ["equal", 3.75],
  ] as const)(
    "uses %s weighting and rounds only the final plus-grade GPA",
    (mode, expected) => {
      expect(
        calculateSemesterGPA(
          [
            {
              courseId: "synthetic-plus",
              creditHours: 3,
              gradePoints: letterToGrade("B+").gradePoints,
              includedInGpa: true,
              active: true,
            },
            {
              courseId: "synthetic-a",
              creditHours: 1,
              gradePoints: letterToGrade("A").gradePoints,
              includedInGpa: true,
              active: true,
            },
          ],
          mode,
        ).estimatedGpa,
      ).toBe(expected);
    },
  );

  it("does not round fractional weighted contributions before division", () => {
    expect(
      calculateSemesterGPA([
        {
          courseId: "synthetic-plus",
          creditHours: 1.25,
          gradePoints: 3.5,
          includedInGpa: true,
          active: true,
        },
        {
          courseId: "synthetic-a",
          creditHours: 2.3,
          gradePoints: 4,
          includedInGpa: true,
          active: true,
        },
      ]).estimatedGpa,
    ).toBe(3.82);
  });
});

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
