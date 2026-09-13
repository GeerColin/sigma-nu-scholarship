import { describe, expect, it } from "vitest";
import {
  freezeAssignmentSchema,
  overrideAssignmentSchema,
  refreshAssignmentsSchema,
  removeOverrideSchema,
  resolveAssignmentSchema,
  studyHourRuleSetSchema,
} from "@/features/study-hours/validation";

const assignmentId = "90000000-0000-4000-8000-000000000001";

describe("study-hour administrative validation", () => {
  it("requires explicit confirmation and a reason for an override", () => {
    expect(
      overrideAssignmentSchema.safeParse({
        assignmentId,
        hours: 3,
        reason: "Documented synthetic exception",
        confirmed: true,
      }).success,
    ).toBe(true);
    expect(
      overrideAssignmentSchema.safeParse({
        assignmentId,
        hours: 3,
        reason: "Documented synthetic exception",
        confirmed: false,
      }).success,
    ).toBe(false);
  });

  it("requires confirmation for override removal and assignment freeze", () => {
    expect(
      removeOverrideSchema.safeParse({
        assignmentId,
        reason: "Return to the calculated requirement",
        confirmed: true,
      }).success,
    ).toBe(true);
    expect(
      removeOverrideSchema.safeParse({
        assignmentId,
        reason: "Return to the calculated requirement",
        confirmed: false,
      }).success,
    ).toBe(false);
    expect(
      freezeAssignmentSchema.safeParse({ assignmentId, confirmed: true })
        .success,
    ).toBe(true);
    expect(
      freezeAssignmentSchema.safeParse({ assignmentId, confirmed: false })
        .success,
    ).toBe(false);
  });

  it("restricts frozen-assignment decisions", () => {
    expect(
      resolveAssignmentSchema.safeParse({
        assignmentId,
        decision: "update",
        reason: "Use recalculated requirement",
      }).success,
    ).toBe(true);
    expect(
      resolveAssignmentSchema.safeParse({
        assignmentId,
        decision: "delete",
        reason: "Invalid",
      }).success,
    ).toBe(false);
  });

  it("accepts a confirmed, complete study-hour rule set", () => {
    expect(
      studyHourRuleSetSchema.safeParse({
        gpa350To400Hours: "1",
        gpa300To349Hours: "1",
        gpa275To299Hours: "2",
        gpa250To274Hours: "2",
        gpa225To249Hours: "3",
        gpa200To224Hours: "4",
        gpaBelow200Hours: "5",
        dAdjustmentHours: "1",
        fAdjustmentHours: "2",
        maximumHours: "5",
        reason: "Initial synthetic policy",
        confirmed: true,
      }).success,
    ).toBe(true);
  });

  it("rejects unconfirmed rules and an F adjustment below the D adjustment", () => {
    const invalid = {
      gpa350To400Hours: 1,
      gpa300To349Hours: 1,
      gpa275To299Hours: 2,
      gpa250To274Hours: 2,
      gpa225To249Hours: 3,
      gpa200To224Hours: 4,
      gpaBelow200Hours: 5,
      dAdjustmentHours: 3,
      fAdjustmentHours: 2,
      maximumHours: 5,
      reason: "Invalid policy",
      confirmed: false,
    };
    expect(studyHourRuleSetSchema.safeParse(invalid).success).toBe(false);
  });

  it("requires a real week identifier for assignment refresh", () => {
    expect(
      refreshAssignmentsSchema.safeParse({ weekId: assignmentId }).success,
    ).toBe(true);
    expect(
      refreshAssignmentsSchema.safeParse({ weekId: "Week 3" }).success,
    ).toBe(false);
  });
});
