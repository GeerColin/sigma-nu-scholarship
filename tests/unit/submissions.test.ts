import { describe, expect, it } from "vitest";
import {
  detectAcademicAlert,
  determineSubmissionStatus,
} from "@/lib/domain/submissions";

const deadline = new Date("2026-09-12T03:59:00.000Z");

describe("submission timing", () => {
  it("records an on-time submission", () => {
    expect(
      determineSubmissionStatus(
        new Date("2026-09-12T03:00:00Z"),
        new Date("2026-09-12T03:00:00Z"),
        deadline,
      ).displayLabel,
    ).toBe("Submitted on time");
  });

  it("preserves original on-time status for a late revision", () => {
    const result = determineSubmissionStatus(
      new Date("2026-09-12T03:00:00Z"),
      new Date("2026-09-12T04:10:00Z"),
      deadline,
    );
    expect(result).toMatchObject({
      originalTiming: "on_time",
      latestRevisionTiming: "late",
      editedAfterDeadline: true,
      displayLabel: "Submitted on time — edited after deadline",
    });
  });

  it("records an originally late submission as late", () => {
    expect(
      determineSubmissionStatus(
        new Date("2026-09-12T04:00:00Z"),
        new Date("2026-09-12T04:05:00Z"),
        deadline,
      ).displayLabel,
    ).toBe("Submitted late");
  });
});

describe("academic alert detection", () => {
  const thresholds = { percentageDrop: 10, letterSteps: 1 };

  it("detects configured percentage and letter decreases", () => {
    expect(
      detectAcademicAlert(
        { type: "percentage", value: 92 },
        { type: "percentage", value: 81 },
        thresholds,
      ),
    ).toEqual({ kind: "percentage_drop", decrease: 11 });
    expect(
      detectAcademicAlert(
        { type: "letter", value: "B" },
        { type: "letter", value: "C" },
        thresholds,
      ),
    ).toEqual({ kind: "letter_drop", decrease: 1 });
  });

  it("does not invent comparisons for non-GPA or mismatched types", () => {
    expect(
      detectAcademicAlert(
        { type: "non_gpa", value: "Satisfactory" },
        { type: "non_gpa", value: "Incomplete" },
        thresholds,
      ),
    ).toBeNull();
  });
});
