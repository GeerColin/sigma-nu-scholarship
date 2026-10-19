// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PresentationPrivacyProvider } from "@/components/presentation-privacy";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/member/history",
  useRouter: () => ({ refresh: vi.fn() }),
  notFound: () => {
    throw new Error("Synthetic not found");
  },
}));
vi.mock("@/lib/auth/guards", () => ({
  requireApprovedMemberContext: async () => ({
    chapterId: "synthetic-chapter",
    memberId: "synthetic-member",
    roles: ["member"],
  }),
}));
vi.mock("@/lib/academic/calendar", () => ({
  getActiveAcademicPeriod: async () => ({
    semester: { id: "synthetic-semester", name: "Synthetic semester" },
    currentWeek: null,
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        order: async () => ({
          data: [3.63, 3.25].map((gpa, index) => ({
            id: `synthetic-submission-${index}`,
            revision_number: index === 0 ? 2 : 1,
            original_submitted_at: "2026-09-06T22:00:00Z",
            original_timing: "on_time",
            revision_timing: index === 0 ? "late" : "on_time",
            estimated_gpa_snapshot: String(gpa),
            submission_comment: null,
            academic_weeks: { label: `Synthetic week ${2 - index}` },
          })),
          error: null,
        }),
      };
      return query;
    },
  }),
}));

import MemberSectionPage from "@/app/member/[section]/page";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe("plus-grade GPA history", () => {
  it("displays new and historical snapshots without recalculating them or changing original timing", async () => {
    render(
      <PresentationPrivacyProvider initialEnabled={false}>
        {await MemberSectionPage({
          params: Promise.resolve({ section: "history" }),
        })}
      </PresentationPrivacyProvider>,
    );
    expect(
      await screen.findByText("Estimated Synthetic semester GPA: 3.63"),
    ).toBeTruthy();
    expect(
      screen.getByText("Estimated Synthetic semester GPA: 3.25"),
    ).toBeTruthy();
    expect(
      screen.getByText("Submitted on time — edited after deadline"),
    ).toBeTruthy();
    expect(
      screen.getByText(/It may differ from your official university GPA/),
    ).toBeTruthy();
  });

  it("keeps new and historical GPA snapshots masked in private and unresolved server renders", async () => {
    const page = await MemberSectionPage({
      params: Promise.resolve({ section: "history" }),
    });
    for (const initialEnabled of [true, false]) {
      const markup = renderToStaticMarkup(
        <PresentationPrivacyProvider initialEnabled={initialEnabled}>
          {page}
        </PresentationPrivacyProvider>,
      );
      expect(markup).not.toContain("3.63");
      expect(markup).not.toContain("3.25");
    }
    render(
      <PresentationPrivacyProvider initialEnabled>
        {page}
      </PresentationPrivacyProvider>,
    );
    expect(screen.queryByText(/GPA: 3\./)).toBeNull();
  });
});
