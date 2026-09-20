import { describe, expect, it } from "vitest";
import {
  gradeCheckRequiredForWeek,
  gradeCheckStatus,
  gradeCheckStatusLabel,
  summarizeGradeCheckWeek,
} from "@/lib/domain/grade-checks";

describe("grade-check scheduling", () => {
  it("excludes weeks before the configured start and explicitly skipped weeks", () => {
    expect(
      gradeCheckRequiredForWeek({
        sequenceNumber: 1,
        firstGradeCheckSequence: 2,
        configuredRequired: true,
      }),
    ).toBe(false);
    expect(
      gradeCheckRequiredForWeek({
        sequenceNumber: 2,
        firstGradeCheckSequence: 2,
        configuredRequired: false,
      }),
    ).toBe(false);
    expect(
      gradeCheckRequiredForWeek({
        sequenceNumber: 3,
        firstGradeCheckSequence: 2,
        configuredRequired: true,
      }),
    ).toBe(true);
  });

  it("treats the exact deadline as awaiting and only marks missing afterward", () => {
    const deadlineAt = "2026-09-20T23:59:00.000Z";
    expect(
      gradeCheckStatus({
        required: true,
        submitted: false,
        deadlineAt,
        now: new Date(deadlineAt),
      }),
    ).toBe("awaiting");
    expect(
      gradeCheckStatus({
        required: true,
        submitted: false,
        deadlineAt,
        now: new Date("2026-09-21T00:00:00.000Z"),
      }),
    ).toBe("missing");
  });

  it("preserves the original submission timing when a member revises", () => {
    const deadlineAt = "2026-09-20T23:59:00.000Z";
    expect(
      gradeCheckStatus({
        required: true,
        submitted: true,
        originalTiming: "late",
        deadlineAt,
      }),
    ).toBe("late");
    expect(
      gradeCheckStatus({
        required: true,
        submitted: true,
        originalTiming: "on_time",
        deadlineAt,
      }),
    ).toBe("on_time");
    expect(gradeCheckStatusLabel("not_required")).toBe(
      "No grade check required",
    );
  });

  it("counts each active member once and keeps unlinked or course-less members in the denominator", () => {
    const summary = summarizeGradeCheckWeek({
      activeMemberIds: ["member-a", "member-b", "member-c"],
      submissions: [
        { memberId: "member-a", originalTiming: "on_time" },
        { memberId: "member-a", originalTiming: "on_time" },
        { memberId: "member-b", originalTiming: "late" },
      ],
      required: true,
      excludedReason: null,
      deadlineAt: "2026-09-20T23:59:00.000Z",
      now: new Date("2026-09-21T00:00:00.000Z"),
    });
    expect(summary).toEqual({
      onTimeCount: 1,
      lateCount: 1,
      awaitingCount: 0,
      missingCount: 1,
      expectedCount: 3,
    });
  });

  it("returns neutral awaiting counts before the deadline and excludes future weeks", () => {
    const deadlineAt = "2026-09-20T23:59:00.000Z";
    expect(
      summarizeGradeCheckWeek({
        activeMemberIds: ["member-a", "member-b"],
        submissions: [],
        required: true,
        excludedReason: null,
        deadlineAt,
        now: new Date("2026-09-20T23:58:00.000Z"),
      }),
    ).toMatchObject({ awaitingCount: 2, missingCount: 0, expectedCount: 2 });
    expect(
      summarizeGradeCheckWeek({
        activeMemberIds: ["member-a", "member-b"],
        submissions: [],
        required: true,
        excludedReason: "future",
        deadlineAt,
        now: new Date("2026-09-20T23:58:00.000Z"),
      }),
    ).toEqual({
      onTimeCount: 0,
      lateCount: 0,
      awaitingCount: 0,
      missingCount: 0,
      expectedCount: 0,
    });
  });
});
