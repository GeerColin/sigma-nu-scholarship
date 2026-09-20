import { describe, expect, it } from "vitest";
import {
  manageScheduleOccurrenceSchema,
  proctorScheduleEditSchema,
  scheduleSeriesSchema,
} from "@/features/schedule/validation";
import type { ScheduleEntry } from "@/features/schedule/queries";
import { scheduleHighlights } from "@/features/schedule/state";

const proctorId = "00000000-0000-4000-8000-000000000001";
const baseEntry: ScheduleEntry = {
  occurrenceId: "00000000-0000-4000-8000-000000000002",
  seriesId: "00000000-0000-4000-8000-000000000003",
  sessionDate: "2026-09-21",
  startTime: "10:00:00",
  endTime: "11:00:00",
  location: "Chapter room",
  instructions: null,
  cancelled: false,
  cancellationReason: null,
  startsAt: "2026-09-21T14:00:00.000Z",
  endsAt: "2026-09-21T15:00:00.000Z",
  semesterTimezone: "America/New_York",
  proctors: [{ memberId: proctorId, fullName: "Synthetic Proctor" }],
};

describe("recurring schedule validation", () => {
  it("requires at least one proctor and an ordered time range", () => {
    expect(
      scheduleSeriesSchema.safeParse({
        semesterId: baseEntry.seriesId,
        dayOfWeek: 1,
        startTime: "11:00",
        endTime: "10:00",
        location: "Room",
        proctorMemberIds: [],
      }).success,
    ).toBe(false);
  });

  it("requires a reason for cancellations", () => {
    expect(
      manageScheduleOccurrenceSchema.safeParse({
        occurrenceId: baseEntry.occurrenceId,
        operation: "cancel",
      }).success,
    ).toBe(false);
  });

  it("accepts a proctor edit with only dated fields", () => {
    expect(
      proctorScheduleEditSchema.safeParse({
        occurrenceId: baseEntry.occurrenceId,
        startTime: "10:30",
        endTime: "11:30",
        location: "Library",
      }).success,
    ).toBe(true);
  });
});

describe("schedule dashboard highlights", () => {
  it("returns all simultaneous next sessions and filters a proctor's shifts", () => {
    const second = {
      ...baseEntry,
      occurrenceId: "00000000-0000-4000-8000-000000000004",
    };
    const other = {
      ...baseEntry,
      occurrenceId: "00000000-0000-4000-8000-000000000005",
      startsAt: "2026-09-21T16:00:00.000Z",
      endsAt: "2026-09-21T17:00:00.000Z",
      proctors: [
        { memberId: "00000000-0000-4000-8000-000000000006", fullName: "Other" },
      ],
    };
    const result = scheduleHighlights(
      [baseEntry, second, other],
      proctorId,
      new Date("2026-09-20T12:00:00.000Z"),
    );
    expect(result.state).toBe("upcoming");
    expect(result.entries).toHaveLength(2);
    expect(
      result.entries.every(
        (entry) => entry.occurrenceId !== other.occurrenceId,
      ),
    ).toBe(true);
  });

  it("does not surface cancelled sessions", () => {
    expect(
      scheduleHighlights(
        [{ ...baseEntry, cancelled: true }],
        undefined,
        new Date("2026-09-20T12:00:00.000Z"),
      ),
    ).toEqual({ state: "empty", entries: [] });
  });
});
