import { describe, expect, it } from "vitest";
import {
  memberCheckInState,
  memberStudyHourState,
} from "@/features/members/member-dashboard-state";

describe("member dashboard action state", () => {
  const deadlineAt = "2026-09-11T23:59:00.000Z";

  it("distinguishes required, overdue, and completed check-ins", () => {
    expect(
      memberCheckInState({
        submitted: false,
        deadlineAt,
        now: new Date("2026-09-10T12:00:00.000Z"),
      }),
    ).toBe("required");
    expect(
      memberCheckInState({
        submitted: false,
        deadlineAt,
        now: new Date("2026-09-12T12:00:00.000Z"),
      }),
    ).toBe("overdue");
    expect(
      memberCheckInState({
        submitted: true,
        deadlineAt,
        now: new Date("2026-09-12T12:00:00.000Z"),
      }),
    ).toBe("complete");
  });

  it("calculates study-hour progress without exceeding 100 percent", () => {
    expect(memberStudyHourState(null, 0)).toEqual({
      status: "not_assigned",
      remainingMinutes: null,
      progressPercent: 0,
    });
    expect(memberStudyHourState(180, 90)).toEqual({
      status: "in_progress",
      remainingMinutes: 90,
      progressPercent: 50,
    });
    expect(memberStudyHourState(180, 240)).toEqual({
      status: "complete",
      remainingMinutes: 0,
      progressPercent: 100,
    });
  });
});
