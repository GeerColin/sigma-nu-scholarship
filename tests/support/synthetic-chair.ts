type SyntheticRow = Record<string, unknown>;
export type SyntheticTables = Record<string, SyntheticRow[]>;

export function createSyntheticChairClient(overrides: SyntheticTables = {}) {
  const fixtureMembers = [
    {
      id: "synthetic-member-1",
      chapter_id: "synthetic-chapter",
      profile_id: "synthetic-chair-profile",
      full_name: "Synthetic Chair",
      status: "active",
      notification_email: null,
      member_roles: [
        { role: "member", active: true },
        { role: "scholarship_chair", active: true },
      ],
    },
    {
      id: "synthetic-member-2",
      chapter_id: "synthetic-chapter",
      profile_id: null,
      full_name: "Synthetic Member",
      status: "active",
      notification_email: null,
      member_roles: [{ role: "member", active: true }],
    },
  ];
  const tables: SyntheticTables = {
    members: fixtureMembers,
    access_requests: [],
    chapters: [
      {
        id: "synthetic-chapter",
        fraternity_name: "Synthetic Fraternity",
        chapter_name: "Synthetic Chapter",
        institution_name: "Synthetic Institution",
      },
    ],
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
        first_grade_check_week_id: "synthetic-week",
      },
    ],
    academic_weeks: [
      {
        id: "synthetic-week",
        semester_id: "synthetic-semester",
        sequence_number: 1,
        label: "Synthetic Week",
        starts_on: "2026-10-05",
        ends_on: "2026-10-11",
        deadline_at: "2026-10-11T23:00:00Z",
        grade_check_required: true,
      },
    ],
    grade_submissions: [],
    study_hour_assignments: fixtureMembers.map((member, index) => ({
      id: `synthetic-assignment-${index + 1}`,
      week_id: "synthetic-week",
      member_id: member.id,
      automatic_hours: 4,
      final_hours: 3,
      override_hours: 3,
      override_reason: "Synthetic adjustment",
      state: "review_required",
      proposed_hours: 5,
    })),
    study_sessions: [],
    academic_alerts: [],
    study_hour_rule_sets: [],
    ...overrides,
  };
  return {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "synthetic-chair-profile",
            email: "synthetic-chair@example.invalid",
          },
        },
        error: null,
      }),
    },
    from: (table: string) => {
      let rows = tables[table] ?? [];
      const result = () => ({ data: rows, error: null, status: 200 });
      const query = {
        select: () => query,
        order: () => query,
        limit: () => query,
        lte: () => query,
        gte: () => query,
        is: () => query,
        in: () => query,
        eq: (column: string, value: unknown) => {
          rows = rows.filter((row) => row[column] === value);
          return query;
        },
        maybeSingle: async () => ({
          data: rows[0] ?? null,
          error: null,
          status: 200,
        }),
        single: async () => ({
          data: rows[0] ?? null,
          error: null,
          status: 200,
        }),
        then: (resolve: (value: ReturnType<typeof result>) => unknown) =>
          Promise.resolve(result()).then(resolve),
      };
      return query;
    },
  };
}
