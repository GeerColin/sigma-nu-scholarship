import { describe, expect, it } from "vitest";
import {
  calculateCompletedStudyMinutes,
  calculateStudyHourRequirement,
  evaluateFrozenAssignment,
  resolveAssignmentHours,
} from "@/lib/domain/study-hours";

describe("study-hour calculation", () => {
  it.each([
    [3.75, 1],
    [3.2, 1],
    [2.8, 2],
    [2.6, 2],
    [2.3, 3],
    [2.1, 4],
    [1.9, 5],
  ] as const)("maps GPA %s to %s base hours", (estimatedGpa, expected) => {
    expect(
      calculateStudyHourRequirement({ estimatedGpa, hasD: false, hasF: false })
        .finalHours,
    ).toBe(expected);
  });

  it("uses F as the strongest risk adjustment instead of stacking D and F", () => {
    const result = calculateStudyHourRequirement({
      estimatedGpa: 3.2,
      hasD: true,
      hasF: true,
    });
    expect(result.riskAdjustmentHours).toBe(2);
    expect(result.finalHours).toBe(3);
  });

  it("caps the final requirement", () => {
    expect(
      calculateStudyHourRequirement({
        estimatedGpa: 2.1,
        hasD: false,
        hasF: true,
      }).finalHours,
    ).toBe(5);
  });

  it("applies and removes an override without changing the automatic amount", () => {
    expect(resolveAssignmentHours(4, 2)).toBe(2);
    expect(resolveAssignmentHours(4, null)).toBe(4);
  });

  it("keeps a frozen assignment and requests review after a material recalculation", () => {
    expect(evaluateFrozenAssignment(2, 3, true)).toEqual({
      finalHours: 2,
      reviewRequired: true,
      proposedHours: 3,
    });
    expect(evaluateFrozenAssignment(2, 3, false)).toEqual({
      finalHours: 3,
      reviewRequired: false,
      proposedHours: null,
    });
  });
});

describe("completed study time", () => {
  it("sums integer minutes and ignores voided corrections", () => {
    expect(
      calculateCompletedStudyMinutes([
        { durationMinutes: 60 },
        { durationMinutes: 30 },
        { durationMinutes: 45, voided: true },
      ]),
    ).toBe(90);
  });
});
