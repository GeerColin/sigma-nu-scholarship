import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  filters: [] as Array<[string, string, unknown]>,
}));
vi.mock("@/lib/auth/guards", () => ({
  requireChairContext: async () => ({ chapterId: "synthetic-chapter" }),
}));
vi.mock("@/lib/academic/calendar", () => ({
  getActiveAcademicPeriod: async () => ({
    semester: { id: "current-semester" },
    currentWeek: null,
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      const filters = new Map<string, unknown>();
      const result = () => {
        if (table === "members")
          return {
            data: {
              id: "synthetic-member",
              full_name: "Synthetic",
              status: "active",
              profiles: null,
              member_roles: [],
            },
            error: null,
          };
        if (table === "grade_submissions")
          return {
            data: ["old-semester", "current-semester"]
              .filter(
                (semester) =>
                  !filters.has("academic_weeks.semester_id") ||
                  semester === filters.get("academic_weeks.semester_id"),
              )
              .map((semester) => ({
                id: semester,
                estimated_gpa_snapshot: 3,
                grade_entries: [],
                academic_weeks: { label: semester, sequence_number: 1 },
                is_current: true,
              })),
            error: null,
          };
        return { data: [], error: null };
      };
      const query = {
        select: () => query,
        order: () => query,
        is: () => query,
        eq: (column: string, value: unknown) => {
          filters.set(column, value);
          state.filters.push([table, column, value]);
          return query;
        },
        maybeSingle: async () => result(),
        then: (resolve: (value: ReturnType<typeof result>) => unknown) =>
          Promise.resolve(result()).then(resolve),
      };
      return query;
    },
  }),
}));
import { getMemberDetail } from "@/features/members/queries";

describe("member detail query scope", () => {
  beforeEach(() => {
    state.filters.length = 0;
  });
  it("does not mix another semester into current-semester history", async () => {
    const result = await getMemberDetail("synthetic-member");
    expect(
      result?.member.submissions.map((submission) => submission.id),
    ).toEqual(["current-semester"]);
  });
  it("loads custom reviews only for the requested member", async () => {
    await getMemberDetail("synthetic-member");
    expect(state.filters).toContainEqual([
      "custom_grading_reviews",
      "courses.member_id",
      "synthetic-member",
    ]);
  });
});
