import { describe, expect, it } from "vitest";
import {
  deadlineOverrideSchema,
  semesterSchema,
} from "@/features/settings/validation";

describe("semester configuration validation", () => {
  it("accepts a valid timezone-aware configuration", () => {
    expect(
      semesterSchema.safeParse({
        name: "Fall Synthetic",
        startDate: "2026-08-17",
        endDate: "2026-12-11",
        timezone: "America/New_York",
        deadlineWeekday: 5,
        deadlineTime: "23:59",
        makeActive: true,
      }).success,
    ).toBe(true);
  });

  it("rejects reversed dates and invalid deadline times", () => {
    expect(
      semesterSchema.safeParse({
        name: "Invalid",
        startDate: "2026-12-11",
        endDate: "2026-08-17",
        timezone: "America/New_York",
        deadlineWeekday: 5,
        deadlineTime: "25:00",
        makeActive: true,
      }).success,
    ).toBe(false);
  });

  it("validates a week-specific override", () => {
    expect(
      deadlineOverrideSchema.safeParse({
        weekId: "70000000-0000-4000-8000-000000000001",
        deadlineDate: "2026-09-04",
        deadlineTime: "18:30",
      }).success,
    ).toBe(true);
  });
});
