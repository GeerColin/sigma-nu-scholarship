import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionItem } from "@/features/study-hours/proctor-session-logger";

const fixture = vi.hoisted(() => ({
  roles: ["proctor"],
  selectedColumns: "",
  filters: [] as Array<[string, unknown]>,
  includeRecordedMember: true,
  directoryError: null as { code: string } | null,
  sessionError: null as { code: string } | null,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/guards", () => ({
  requireProctorContext: async () => ({
    chapterId: "synthetic-chapter",
    memberId: "synthetic-proctor",
    memberName: "Synthetic Proctor",
    roles: fixture.roles,
  }),
}));
vi.mock("@/lib/academic/calendar", () => ({
  getActiveAcademicPeriod: async () => null,
}));
vi.mock("@/features/schedule/queries", () => ({
  getScheduleEntries: async () => [],
}));
vi.mock("@/components/brand-mark", () => ({ BrandMark: () => null }));
vi.mock("@/components/workspace-switcher", () => ({
  WorkspaceSwitcher: () => null,
}));
vi.mock("@/components/presentation-privacy", () => ({
  PresentationPrivacyControls: () => null,
  PrivacyActionGuard: () => null,
}));
vi.mock("@/features/schedule/schedule-preview-card", () => ({
  SchedulePreviewCard: () => null,
}));
vi.mock("@/features/study-hours/proctor-session-logger", () => ({
  ProctorSessionLogger: () => null,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async () => ({
      data: [
        {
          member_id: "synthetic-other-member",
          full_name: "Synthetic Other Member",
        },
        ...(fixture.includeRecordedMember
          ? [
              {
                member_id: "synthetic-study-member",
                full_name: "Synthetic Study Member",
              },
            ]
          : []),
      ],
      error: fixture.directoryError,
    }),
    from: () => {
      const result = () => ({
        data: [
          {
            id: "synthetic-session",
            ...(fixture.selectedColumns
              .split(",")
              .map((column) => column.trim())
              .includes("member_id")
              ? { member_id: "synthetic-study-member" }
              : {}),
            session_date: "2026-10-06",
            duration_minutes: 60,
            notes: null,
            proctor_member_id: "synthetic-proctor",
            week_id: "synthetic-week",
            // Ordinary Proctors cannot read other members' private roster rows.
            member: fixture.roles.includes("scholarship_chair")
              ? { full_name: "Synthetic Study Member" }
              : null,
            proctor: { full_name: "Synthetic Proctor" },
            academic_weeks: {
              label: "Synthetic Week",
              starts_on: "2026-10-05",
              ends_on: "2026-10-11",
            },
          },
        ],
        error: fixture.sessionError,
      });
      const query = {
        select: (columns: string) => {
          fixture.selectedColumns = columns;
          return query;
        },
        is: () => query,
        order: () => query,
        limit: () => query,
        eq: (column: string, value: unknown) => {
          fixture.filters.push([column, value]);
          return query;
        },
        then: (resolve: (value: ReturnType<typeof result>) => unknown) =>
          Promise.resolve(result()).then(resolve),
      };
      return query;
    },
  }),
}));

import ProctorPage from "@/app/proctor/page";
import { ProctorSessionLogger } from "@/features/study-hours/proctor-session-logger";

function findSessionItems(node: ReactNode): SessionItem[] | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const items = findSessionItems(child);
      if (items) return items;
    }
    return undefined;
  }
  if (
    !isValidElement<{ children?: ReactNode; initialSessions?: SessionItem[] }>(
      node,
    )
  )
    return undefined;
  if (node.type === ProctorSessionLogger) return node.props.initialSessions;
  return findSessionItems(node.props.children);
}

describe("Proctor portal session names", () => {
  beforeEach(() => {
    fixture.roles = ["proctor"];
    fixture.selectedColumns = "";
    fixture.filters.length = 0;
    fixture.includeRecordedMember = true;
    fixture.directoryError = null;
    fixture.sessionError = null;
  });

  it("shows the recorded member's name for an ordinary Proctor when the private join is filtered", async () => {
    const page = await ProctorPage({ searchParams: Promise.resolve({}) });
    expect(findSessionItems(page)?.[0]?.memberName).toBe(
      "Synthetic Study Member",
    );
    expect(fixture.filters).toContainEqual([
      "proctor_member_id",
      "synthetic-proctor",
    ]);
  });

  it("keeps the recorded member's name visible for the Scholarship Chair", async () => {
    fixture.roles = ["scholarship_chair"];
    const page = await ProctorPage({ searchParams: Promise.resolve({}) });
    expect(findSessionItems(page)?.[0]?.memberName).toBe(
      "Synthetic Study Member",
    );
    expect(fixture.filters).not.toContainEqual([
      "proctor_member_id",
      "synthetic-proctor",
    ]);
  });

  it("retains a Chair-visible historical name when the member is no longer in the active directory", async () => {
    fixture.roles = ["scholarship_chair"];
    fixture.includeRecordedMember = false;
    const page = await ProctorPage({ searchParams: Promise.resolve({}) });
    expect(findSessionItems(page)?.[0]?.memberName).toBe(
      "Synthetic Study Member",
    );
  });

  it("does not substitute a different member's name when the ID is absent from the permitted directory", async () => {
    fixture.includeRecordedMember = false;
    const page = await ProctorPage({ searchParams: Promise.resolve({}) });
    expect(findSessionItems(page)?.[0]?.memberName).toBe("Unknown member");
  });

  it("fails closed when the permitted directory cannot be loaded", async () => {
    fixture.directoryError = { code: "42501" };
    await expect(
      ProctorPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("Could not load the Proctor portal.");
  });

  it("fails closed when recorded sessions cannot be loaded", async () => {
    fixture.sessionError = { code: "PGRST003" };
    await expect(
      ProctorPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("Could not load the Proctor portal.");
  });
});
