import { describe, expect, it } from "vitest";
import {
  dateInTimeZone,
  formatDateTimeInTimeZone,
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

describe("formatDateTimeInTimeZone", () => {
  it("formats daylight time in the configured chapter timezone", () => {
    expect(
      formatDateTimeInTimeZone("2026-09-15T22:00:00.000Z", "America/New_York"),
    ).toBe("Sep 15, 2026, 6:00 PM EDT");
  });

  it("formats standard time in the configured chapter timezone", () => {
    expect(
      formatDateTimeInTimeZone("2026-01-15T23:00:00.000Z", "America/New_York"),
    ).toBe("Jan 15, 2026, 6:00 PM EST");
  });

  it("preserves local date rollover independently of the viewer timezone", () => {
    expect(
      formatDateTimeInTimeZone("2026-09-07T02:30:00.000Z", "America/New_York"),
    ).toBe("Sep 6, 2026, 10:30 PM EDT");
  });

  it("handles invalid and missing values clearly", () => {
    expect(
      formatDateTimeInTimeZone("not-a-timestamp", "America/New_York"),
    ).toBe("Invalid timestamp");
    expect(
      formatDateTimeInTimeZone("2026-09-15T22:00:00.000", "America/New_York"),
    ).toBe("Invalid timestamp");
    expect(formatDateTimeInTimeZone("2026-09-15T22:00:00.000Z", null)).toBe(
      "Timezone unavailable",
    );
    expect(
      formatDateTimeInTimeZone("2026-09-15T22:00:00.000Z", "Not/A_Timezone"),
    ).toBe("Invalid timezone");
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
