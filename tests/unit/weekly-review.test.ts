import { describe, expect, it } from "vitest";
import { evaluateFrozenAssignment } from "@/lib/domain/study-hours";
import {
  historicalSubmissionStatus,
  studyHourProgress,
} from "@/lib/domain/weekly-review";

describe("weekly study-hour progress", () => {
  it("reports the shortfall against the saved final assignment", () => {
    expect(studyHourProgress(2, [{ durationMinutes: 45 }])).toEqual({
      requiredMinutes: 120,
      completedMinutes: 45,
      shortfallMinutes: 75,
      status: "incomplete",
    });
  });

  it.each([
    [0, 120, "incomplete"],
    [120, 0, "complete"],
    [150, 0, "complete"],
  ] as const)(
    "classifies %s completed minutes with a %s-minute shortfall as %s",
    (completedMinutes, shortfallMinutes, status) => {
      const sessions = completedMinutes
        ? [{ durationMinutes: completedMinutes }]
        : [];
      expect(studyHourProgress(2, sessions)).toEqual({
        requiredMinutes: 120,
        completedMinutes,
        shortfallMinutes,
        status,
      });
    },
  );

  it("keeps an absent assignment distinct from an explicit zero-hour requirement", () => {
    expect(studyHourProgress(null, [{ durationMinutes: 30 }])).toEqual({
      requiredMinutes: null,
      completedMinutes: 30,
      shortfallMinutes: null,
      status: "not_assigned",
    });
    expect(studyHourProgress(0, [])).toEqual({
      requiredMinutes: 0,
      completedMinutes: 0,
      shortfallMinutes: 0,
      status: "not_required",
    });
  });

  it.each([
    [1.1, 66],
    ["1.1", 66],
    [2.25, 135],
    ["2.25", 135],
    [4.1, 246],
  ] as const)(
    "converts %s saved hours to exactly %s minutes",
    (hours, minutes) => {
      expect(studyHourProgress(hours, [{ durationMinutes: minutes }])).toEqual({
        requiredMinutes: minutes,
        completedMinutes: minutes,
        shortfallMinutes: 0,
        status: "complete",
      });
    },
  );

  it.each([
    1.01,
    0.00000000000000000001,
    "0.001",
    "1.0000000000000000000001",
    -1,
    NaN,
    Infinity,
    "",
    " ",
    "invalid",
    "0x1",
    "1e2",
  ])("rejects an invalid or non-whole-minute assignment: %s", (hours) => {
    expect(() => studyHourProgress(hours, [])).toThrow(
      "Final study-hour requirement must be a nonnegative whole number of minutes.",
    );
  });

  it("excludes voided sessions without discarding completed work", () => {
    expect(
      studyHourProgress(2, [
        { durationMinutes: 60 },
        { durationMinutes: 30 },
        { durationMinutes: 45, voided: true },
      ]),
    ).toEqual({
      requiredMinutes: 120,
      completedMinutes: 90,
      shortfallMinutes: 30,
      status: "incomplete",
    });
  });

  it("uses the saved final hours while a frozen assignment has a larger proposal", () => {
    const assignment = evaluateFrozenAssignment(2, 5, true);
    expect(
      studyHourProgress(assignment.finalHours, [{ durationMinutes: 120 }]),
    ).toEqual({
      requiredMinutes: 120,
      completedMinutes: 120,
      shortfallMinutes: 0,
      status: "complete",
    });
  });

  it.each([0, -1, 1.5, NaN, Infinity])(
    "rejects an invalid non-voided session duration: %s",
    (durationMinutes) => {
      expect(() => studyHourProgress(2, [{ durationMinutes }])).toThrow(
        "Study-session duration must be a positive integer number of minutes.",
      );
    },
  );

  it.each([Number.MAX_SAFE_INTEGER, "150119987579017"])(
    "rejects a requirement outside safe integer minutes: %s",
    (hours) => {
      expect(() => studyHourProgress(hours, [])).toThrow(
        "Final study-hour requirement must be a nonnegative whole number of minutes.",
      );
    },
  );
});

describe("historical weekly submission status", () => {
  it("does not infer a historical missing check-in from the current roster", () => {
    expect(
      historicalSubmissionStatus({
        required: true,
        submitted: false,
        deadlineAt: "2026-09-20T23:00:00.000Z",
        now: new Date("2026-10-18T23:00:00.000Z"),
        historical: true,
      }),
    ).toBe("eligibility_unknown");
  });

  it.each([
    {
      historical: true,
      required: true,
      submitted: true,
      originalTiming: "on_time",
      expected: "on_time",
    },
    {
      historical: true,
      required: true,
      submitted: true,
      originalTiming: "late",
      expected: "late",
    },
    {
      historical: true,
      required: false,
      submitted: false,
      originalTiming: null,
      expected: "not_required",
    },
    {
      historical: true,
      required: false,
      submitted: true,
      originalTiming: "late",
      expected: "not_required",
    },
    {
      historical: false,
      required: true,
      submitted: true,
      originalTiming: "on_time",
      expected: "on_time",
    },
    {
      historical: false,
      required: true,
      submitted: true,
      originalTiming: "late",
      expected: "late",
    },
    {
      historical: false,
      required: true,
      submitted: false,
      originalTiming: null,
      expected: "missing",
    },
    {
      historical: false,
      required: false,
      submitted: false,
      originalTiming: null,
      expected: "not_required",
    },
  ] as const)(
    "preserves $expected for historical=$historical, required=$required, submitted=$submitted",
    ({ expected, ...input }) => {
      expect(
        historicalSubmissionStatus({
          ...input,
          deadlineAt: "2026-09-20T23:00:00.000Z",
          now: new Date("2026-10-18T23:00:00.000Z"),
        }),
      ).toBe(expected);
    },
  );

  it("preserves current-week awaiting status at the exact deadline", () => {
    expect(
      historicalSubmissionStatus({
        required: true,
        submitted: false,
        deadlineAt: "2026-10-18T23:00:00.000Z",
        now: new Date("2026-10-18T23:00:00.000Z"),
        historical: false,
      }),
    ).toBe("awaiting");
  });
});
