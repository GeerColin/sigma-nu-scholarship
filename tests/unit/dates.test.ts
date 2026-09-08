import { describe, expect, it } from "vitest";
import {
  dateInTimeZone,
  generateAcademicWeekDates,
  timeInTimeZone,
} from "@/lib/domain/dates";

describe("dateInTimeZone", () => {
  it("uses the configured chapter timezone at a UTC date boundary", () => {
    const instant = new Date("2026-09-07T02:30:00.000Z");
    expect(dateInTimeZone(instant, "America/New_York")).toBe("2026-09-06");
    expect(dateInTimeZone(instant, "UTC")).toBe("2026-09-07");
  });

  it("formats a stored deadline for date and time form controls", () => {
    const deadline = new Date("2026-09-12T03:59:00.000Z");
    expect(dateInTimeZone(deadline, "America/New_York")).toBe("2026-09-11");
    expect(timeInTimeZone(deadline, "America/New_York")).toBe("23:59");
  });
});

describe("generateAcademicWeekDates", () => {
  it("creates deterministic seven-day ranges and a partial final week", () => {
    expect(
      generateAcademicWeekDates({
        startDate: "2026-08-17",
        endDate: "2026-09-02",
        deadlineWeekday: 5,
      }),
    ).toEqual([
      {
        sequenceNumber: 1,
        startsOn: "2026-08-17",
        endsOn: "2026-08-23",
        deadlineDate: "2026-08-21",
      },
      {
        sequenceNumber: 2,
        startsOn: "2026-08-24",
        endsOn: "2026-08-30",
        deadlineDate: "2026-08-28",
      },
      {
        sequenceNumber: 3,
        startsOn: "2026-08-31",
        endsOn: "2026-09-02",
        deadlineDate: "2026-09-02",
      },
    ]);
  });
});
