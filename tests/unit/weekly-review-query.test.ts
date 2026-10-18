import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SyntheticTables } from "../support/synthetic-chair";
import { getWeeklyReview } from "@/features/weekly-review/queries";
import {
  weeklyReviewHref,
  weeklyReviewQuerySchema,
} from "@/features/weekly-review/validation";

const state = vi.hoisted(() => ({
  tables: {} as SyntheticTables,
  pageCap: 500,
  signedIn: true,
  failSessions: false,
  reads: [] as string[],
}));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`Redirect: ${path}`);
  },
}));
vi.mock("@/lib/supabase/server", async () => {
  const { createSyntheticChairClient } =
    await import("../support/synthetic-chair");
  return {
    createClient: async () => {
      const client = createSyntheticChairClient(state.tables, state.pageCap);
      const auth = client.auth.getUser;
      return {
        ...client,
        auth: {
          getUser: async () =>
            state.signedIn ? auth() : { data: { user: null }, error: null },
        },
        from: (table: string) => {
          state.reads.push(table);
          const query = client.from(table);
          if (state.failSessions && table === "study_sessions") {
            query.then = (resolve) =>
              Promise.resolve({
                data: null,
                error: { code: "PGRST000", message: "Synthetic failure" },
                status: 503,
              }).then(resolve as never);
          }
          return query;
        },
      };
    },
  };
});

function week(
  id: string,
  sequence: number,
  start: string,
  end: string,
  required = true,
) {
  return {
    id,
    chapter_id: "synthetic-chapter",
    semester_id: "synthetic-semester",
    sequence_number: sequence,
    label: `Synthetic Week ${sequence}`,
    starts_on: start,
    ends_on: end,
    deadline_at: `${start}T23:00:00Z`,
    grade_check_required: required,
  };
}
function assignment(
  id: string,
  memberId: string,
  weekId: string,
  finalHours: number,
) {
  return {
    id,
    chapter_id: "synthetic-chapter",
    member_id: memberId,
    week_id: weekId,
    final_hours: finalHours,
    automatic_hours: 5,
    override_hours: finalHours,
    state: "frozen",
    proposed_hours: 5,
    updated_at: "2026-09-28T22:00:00Z",
  };
}
function session(
  id: string,
  minutes: number,
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    chapter_id: "synthetic-chapter",
    member_id: "synthetic-member-1",
    week_id: "previous-week",
    session_date: "2026-09-29",
    duration_minutes: minutes,
    voided_at: null,
    created_at: "2026-09-29T22:00:00Z",
    updated_at: "2026-09-29T22:00:00Z",
    ...extra,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-06T16:00:00Z"));
  state.signedIn = true;
  state.failSessions = false;
  state.reads = [];
  state.pageCap = 500;
  state.tables = {
    semesters: [
      {
        id: "synthetic-semester",
        chapter_id: "synthetic-chapter",
        name: "Synthetic Semester",
        start_date: "2026-08-16",
        end_date: "2026-12-05",
        timezone: "America/New_York",
        active: true,
        default_deadline_weekday: 0,
        default_deadline_time: "19:00",
        first_grade_check_week_id: "first-week",
      },
    ],
    academic_weeks: [
      week("first-week", 1, "2026-09-21", "2026-09-27"),
      week("previous-week", 2, "2026-09-28", "2026-10-04"),
      week("synthetic-week", 3, "2026-10-05", "2026-10-11"),
      week("future-week", 4, "2026-10-12", "2026-10-18"),
    ],
    study_hour_assignments: [
      assignment(
        "previous-assignment",
        "synthetic-member-1",
        "previous-week",
        2.25,
      ),
      assignment(
        "current-assignment",
        "synthetic-member-1",
        "synthetic-week",
        5,
      ),
    ],
    study_sessions: [
      session("old-session", 45),
      session("current-session", 120, {
        week_id: "synthetic-week",
        session_date: "2026-10-06",
      }),
    ],
    grade_submissions: [
      {
        id: "old-submission",
        chapter_id: "synthetic-chapter",
        week_id: "previous-week",
        member_id: "synthetic-member-1",
        is_current: true,
        original_timing: "late",
        original_submitted_at: "2026-10-01T22:00:00Z",
      },
    ],
  };
});
afterEach(() => vi.useRealTimers());

describe("authorized weekly report reads", () => {
  it("defaults to the actual current week but selects every academic field from the requested historical week", async () => {
    const current = await getWeeklyReview({});
    expect(current.selectedWeek?.id).toBe("synthetic-week");
    expect(current.members[0]).toMatchObject({
      requiredMinutes: 300,
      completedMinutes: 120,
      submissionStatus: "missing",
    });
    const previous = await getWeeklyReview({ week: "2" });
    expect(previous.selectedWeek?.id).toBe("previous-week");
    expect(previous.period?.currentWeek?.id).toBe("synthetic-week");
    expect(previous.members[0]).toMatchObject({
      requiredMinutes: 135,
      completedMinutes: 45,
      shortfallMinutes: 90,
      status: "incomplete",
      submissionStatus: "late",
    });
    expect(previous.members[1]).toMatchObject({
      requiredMinutes: null,
      status: "not_assigned",
      submissionStatus: "eligibility_unknown",
    });
  });

  it.each(["0", "-1", "1.5", "", "previous-week", "999", "4", ["1", "2"]])(
    "rejects unavailable or malformed week %j without substituting data",
    async (value) => {
      const result = await getWeeklyReview({ week: value });
      expect(result.problem).toBeTruthy();
      expect(result.selectedWeek).toBeNull();
      expect(result.members).toEqual([]);
      expect(state.reads).not.toContain("study_sessions");
    },
  );

  it("does not allow weeks belonging to a foreign chapter or another semester", async () => {
    state.tables.academic_weeks = [
      week("synthetic-week", 3, "2026-10-05", "2026-10-11"),
      {
        ...week("foreign", 1, "2026-09-21", "2026-09-27"),
        chapter_id: "foreign-chapter",
      },
      {
        ...week("other-term", 2, "2026-09-28", "2026-10-04"),
        semester_id: "other-semester",
      },
    ];
    for (const selection of ["1", "2"]) {
      expect(
        (await getWeeklyReview({ week: selection })).selectedWeek,
      ).toBeNull();
    }
  });

  it("handles no semester and no current week explicitly", async () => {
    state.tables.semesters = [];
    expect((await getWeeklyReview({})).problem).toContain("No active semester");
    delete state.tables.semesters;
    state.tables.academic_weeks = [];
    const result = await getWeeklyReview({ week: "2" });
    expect(result.problem).toContain("No current academic week");
    expect(result.members).toEqual([]);
  });

  it("excludes inactive, alumni and foreign-chapter members and their totals", async () => {
    state.tables.members = [
      {
        id: "synthetic-member-1",
        chapter_id: "synthetic-chapter",
        profile_id: "synthetic-chair-profile",
        full_name: "Synthetic Active Chair",
        status: "active",
        member_roles: [
          { role: "member", active: true },
          { role: "scholarship_chair", active: true },
        ],
      },
      ...["inactive", "alumni", "foreign"].map((status) => ({
        id: status,
        chapter_id:
          status === "foreign" ? "foreign-chapter" : "synthetic-chapter",
        full_name: status,
        status: status === "foreign" ? "active" : status,
        member_roles: [],
      })),
    ];
    state.tables.study_hour_assignments!.push(
      assignment("inactive-assignment", "inactive", "previous-week", 20),
    );
    state.tables.study_sessions!.push(
      session("inactive-time", 999, { member_id: "inactive" }),
    );
    const result = await getWeeklyReview({ week: "2" });
    expect(result.members.map((member) => member.name)).toEqual([
      "Synthetic Active Chair",
    ]);
    expect(result.members[0]?.completedMinutes).toBe(45);
  });

  it("uses performance week and final override, excludes voids, and includes valid late-entered corrections", async () => {
    state.tables.study_sessions = [
      session("valid-corrected", 75, {
        created_at: "2026-10-08T12:00:00Z",
        updated_at: "2026-10-09T12:00:00Z",
      }),
      session("void", 500, { voided_at: "2026-10-08T12:00:00Z" }),
      session("wrong-date", 500, { session_date: "2026-10-05" }),
      session("wrong-week", 500, { week_id: "synthetic-week" }),
      session("foreign-chapter", 500, { chapter_id: "foreign-chapter" }),
    ];
    const result = await getWeeklyReview({ week: "2" });
    expect(result.members[0]).toMatchObject({
      completedMinutes: 75,
      requiredMinutes: 135,
      shortfallMinutes: 60,
      activityAfterWeek: true,
    });
  });

  it("compares activity with the local academic week end, not grade deadline or UTC midnight", async () => {
    state.tables.study_sessions = [
      session("sunday-night", 45, {
        created_at: "2026-10-05T02:30:00Z",
        updated_at: "2026-10-05T02:30:00Z",
      }),
    ];
    expect(
      (await getWeeklyReview({ week: "2" })).members[0]?.activityAfterWeek,
    ).toBe(false);
    state.tables.study_sessions = [
      session("monday-local", 45, { created_at: "2026-10-05T04:01:00Z" }),
    ];
    expect(
      (await getWeeklyReview({ week: "2" })).members[0]?.activityAfterWeek,
    ).toBe(true);
  });

  it("preserves stored requirements and hours on skipped weeks", async () => {
    state.tables.academic_weeks![1] = week(
      "previous-week",
      2,
      "2026-09-28",
      "2026-10-04",
      false,
    );
    const result = await getWeeklyReview({ week: "2" });
    expect(result.members[0]).toMatchObject({
      requiredMinutes: 135,
      completedMinutes: 45,
      status: "incomplete",
      submissionStatus: "not_required",
    });
  });

  it("preserves stored hours before grade checking began, even when the configured week flag is required", async () => {
    state.tables.semesters![0]!.first_grade_check_week_id = "synthetic-week";
    const result = await getWeeklyReview({ week: "2" });
    expect(result.selectedWeek).toMatchObject({
      gradeCheckConfigured: true,
      gradeCheckRequired: false,
    });
    expect(result.members[0]).toMatchObject({
      requiredMinutes: 135,
      completedMinutes: 45,
      status: "incomplete",
      submissionStatus: "not_required",
    });
  });

  it.each([500, 100])(
    "aggregates all 1792 sessions even with a provider cap of %s",
    async (cap) => {
      state.pageCap = cap;
      state.tables.study_sessions = Array.from({ length: 1792 }, (_, id) =>
        session(`session-${String(id).padStart(5, "0")}`, 1),
      );
      const result = await getWeeklyReview({ week: "2" });
      expect(result.members[0]).toMatchObject({
        completedMinutes: 1792,
        requiredMinutes: 135,
        shortfallMinutes: 0,
        status: "complete",
      });
    },
  );

  it("preserves fail-closed behavior when session reads fail", async () => {
    state.failSessions = true;
    await expect(getWeeklyReview({ week: "2" })).rejects.toThrow(
      "Could not load weekly academic status.",
    );
  });

  it("requires sign-in before reading week selections", async () => {
    state.signedIn = false;
    await expect(getWeeklyReview({ week: "2" })).rejects.toThrow(
      "Redirect: /login",
    );
    expect(state.reads).toEqual([]);
  });

  it.each(["member", "proctor"])(
    "does not grant %s access to weekly chapter academics",
    async (role) => {
      state.tables.members = [
        {
          id: "synthetic-member-1",
          chapter_id: "synthetic-chapter",
          profile_id: "synthetic-chair-profile",
          full_name: "Synthetic Restricted Member",
          status: "active",
          member_roles: [
            { role: "member", active: true },
            { role, active: true },
          ],
        },
      ];
      await expect(getWeeklyReview({ week: "2" })).rejects.toThrow(
        "Redirect: /member",
      );
      expect(state.reads).not.toContain("semesters");
      expect(state.reads).not.toContain("study_sessions");
    },
  );

  it("retains existing Admin access without granting new mutation operations", async () => {
    state.tables.members = [
      {
        id: "synthetic-member-1",
        chapter_id: "synthetic-chapter",
        profile_id: "synthetic-chair-profile",
        full_name: "Synthetic Admin",
        status: "active",
        member_roles: [
          { role: "member", active: true },
          { role: "admin", active: true },
        ],
      },
    ];
    const report = await getWeeklyReview({ week: "2" });
    expect(report.members[0]).toMatchObject({
      name: "Synthetic Admin",
      completedMinutes: 45,
      requiredMinutes: 135,
    });
  });

  it("requires an approved member link rather than treating Google identity as roster access", async () => {
    state.tables.members = [];
    await expect(getWeeklyReview({ week: "2" })).rejects.toThrow(
      "Redirect: /request-access",
    );
    expect(state.reads).not.toContain("semesters");
  });

  it("validates repeated filters and preserves both filters in navigation URLs", () => {
    expect(
      weeklyReviewQuerySchema.safeParse({ status: ["late", "missing"] })
        .success,
    ).toBe(false);
    expect(
      weeklyReviewHref({ week: 2, status: "late", hours: "incomplete" }),
    ).toBe("/this-week?week=2&status=late&hours=incomplete");
  });
});
