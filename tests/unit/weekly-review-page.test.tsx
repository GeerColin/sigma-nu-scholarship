// @vitest-environment jsdom

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import ThisWeekPage from "@/app/this-week/page";
import { ChairAppShell } from "@/components/chair-app-shell";
import { PresentationPrivacyProvider } from "@/components/presentation-privacy";
import { writeBrowserFixture } from "../support/browser-fixture";
import type { SyntheticTables } from "../support/synthetic-chair";

const fixture = vi.hoisted(() => ({ tables: {} as SyntheticTables }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/this-week",
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  redirect: (path: string) => {
    throw new Error(`Unexpected redirect: ${path}`);
  },
}));
vi.mock("@/lib/supabase/server", async () => {
  const { createSyntheticChairClient } =
    await import("../support/synthetic-chair");
  return {
    createClient: async () => createSyntheticChairClient(fixture.tables, 2),
  };
});

type PageQuery = Awaited<Parameters<typeof ThisWeekPage>[0]["searchParams"]>;
const chapterId = "synthetic-chapter";
const semesterId = "synthetic-semester";

function member(id: string, name: string, status = "active") {
  return {
    id,
    full_name: name,
    chapter_id: chapterId,
    status,
    profile_id: id === "synthetic-member-1" ? "synthetic-chair-profile" : null,
    member_roles: [
      { role: "member", active: true },
      ...(id === "synthetic-member-1"
        ? [{ role: "scholarship_chair", active: true }]
        : []),
    ],
  };
}

function assignment(
  id: string,
  memberId: string,
  weekId: string,
  hours: number | string,
) {
  return {
    id,
    chapter_id: chapterId,
    member_id: memberId,
    week_id: weekId,
    final_hours: hours,
    created_at: "2026-09-28T12:00:00Z",
    updated_at: "2026-09-28T12:00:00Z",
    override_at: null,
  };
}

function session(
  id: string,
  memberId: string,
  weekId: string,
  minutes: number,
  date: string,
) {
  return {
    id,
    chapter_id: chapterId,
    member_id: memberId,
    week_id: weekId,
    duration_minutes: minutes,
    session_date: date,
    voided_at: null,
    created_at: `${date}T15:00:00Z`,
    updated_at: `${date}T15:00:00Z`,
  };
}

function submission(
  id: string,
  memberId: string,
  weekId: string,
  timing: "on_time" | "late",
  submittedAt: string,
) {
  return {
    id,
    chapter_id: chapterId,
    member_id: memberId,
    week_id: weekId,
    is_current: true,
    original_timing: timing,
    original_submitted_at: submittedAt,
  };
}

function weeklyTables(): SyntheticTables {
  return {
    semesters: [
      {
        id: semesterId,
        chapter_id: chapterId,
        name: "Synthetic Semester",
        active: true,
        start_date: "2026-08-16",
        end_date: "2026-12-05",
        timezone: "America/New_York",
        default_deadline_weekday: 0,
        default_deadline_time: "19:00",
        first_grade_check_week_id: "synthetic-week-1",
      },
    ],
    academic_weeks: [
      {
        id: "synthetic-week-1",
        chapter_id: chapterId,
        semester_id: semesterId,
        sequence_number: 1,
        label: "Synthetic first week",
        starts_on: "2026-09-21",
        ends_on: "2026-09-27",
        deadline_at: "2026-09-21T23:00:00Z",
        grade_check_required: true,
      },
      {
        id: "synthetic-week-2",
        chapter_id: chapterId,
        semester_id: semesterId,
        sequence_number: 2,
        label: "Synthetic previous week",
        starts_on: "2026-09-28",
        ends_on: "2026-10-04",
        deadline_at: "2026-09-28T23:00:00Z",
        grade_check_required: true,
      },
      {
        id: "synthetic-week-3",
        chapter_id: chapterId,
        semester_id: semesterId,
        sequence_number: 3,
        label: "Synthetic current week",
        starts_on: "2026-10-05",
        ends_on: "2026-10-11",
        deadline_at: "2026-10-11T23:00:00Z",
        grade_check_required: true,
      },
      {
        id: "synthetic-week-4",
        chapter_id: chapterId,
        semester_id: semesterId,
        sequence_number: 4,
        label: "Synthetic future week",
        starts_on: "2026-10-12",
        ends_on: "2026-10-18",
        deadline_at: "2026-10-18T23:00:00Z",
        grade_check_required: true,
      },
    ],
    members: [
      member("synthetic-member-1", "Synthetic Chair"),
      member("synthetic-partial", "Synthetic Partial"),
      member("synthetic-zero", "Synthetic Zero Logged"),
      member("synthetic-exempt", "Synthetic Exempt"),
      member("synthetic-unassigned", "Synthetic Unassigned"),
      member("synthetic-inactive", "Synthetic Inactive", "inactive"),
      member("synthetic-alumni", "Synthetic Alumni", "alumni"),
      {
        ...member("synthetic-foreign", "Synthetic Foreign"),
        chapter_id: "another-synthetic-chapter",
      },
    ],
    study_hour_assignments: [
      assignment("previous-chair", "synthetic-member-1", "synthetic-week-2", 3),
      {
        ...assignment(
          "previous-partial",
          "synthetic-partial",
          "synthetic-week-2",
          "2.5",
        ),
        override_hours: 2.5,
        automatic_hours: 9,
        proposed_hours: 12,
        state: "frozen",
      },
      assignment("previous-zero", "synthetic-zero", "synthetic-week-2", 1),
      assignment("previous-exempt", "synthetic-exempt", "synthetic-week-2", 0),
      assignment(
        "previous-inactive",
        "synthetic-inactive",
        "synthetic-week-2",
        4,
      ),
      assignment("previous-alumni", "synthetic-alumni", "synthetic-week-2", 4),
      assignment("current-chair", "synthetic-member-1", "synthetic-week-3", 3),
      assignment("current-partial", "synthetic-partial", "synthetic-week-3", 1),
      assignment("current-zero", "synthetic-zero", "synthetic-week-3", 0),
    ],
    study_sessions: [
      session(
        "previous-chair-a",
        "synthetic-member-1",
        "synthetic-week-2",
        60,
        "2026-09-29",
      ),
      session(
        "previous-chair-b",
        "synthetic-member-1",
        "synthetic-week-2",
        120,
        "2026-10-02",
      ),
      session(
        "previous-partial-a",
        "synthetic-partial",
        "synthetic-week-2",
        60,
        "2026-10-02",
      ),
      {
        ...session(
          "previous-partial-void",
          "synthetic-partial",
          "synthetic-week-2",
          500,
          "2026-10-01",
        ),
        voided_at: "2026-10-03T12:00:00Z",
      },
      session(
        "wrong-date",
        "synthetic-partial",
        "synthetic-week-2",
        500,
        "2026-10-05",
      ),
      session(
        "current-chair",
        "synthetic-member-1",
        "synthetic-week-3",
        30,
        "2026-10-06",
      ),
      session(
        "current-partial",
        "synthetic-partial",
        "synthetic-week-3",
        60,
        "2026-10-06",
      ),
    ],
    grade_submissions: [
      submission(
        "previous-chair",
        "synthetic-member-1",
        "synthetic-week-2",
        "on_time",
        "2026-09-28T22:00:00Z",
      ),
      submission(
        "previous-partial",
        "synthetic-partial",
        "synthetic-week-2",
        "late",
        "2026-09-29T00:00:00Z",
      ),
      submission(
        "current-partial",
        "synthetic-partial",
        "synthetic-week-3",
        "on_time",
        "2026-10-05T22:00:00Z",
      ),
    ],
  };
}

beforeEach(() => {
  fixture.tables = weeklyTables();
  sessionStorage.clear();
  document.cookie = "sigma_nu_presentation_privacy=; Max-Age=0; Path=/";
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-06T16:00:00Z"));
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.useRealTimers();
});

async function resolvedPage(query: PageQuery = {}, privacyEnabled = false) {
  const page = await ThisWeekPage({ searchParams: Promise.resolve(query) });
  // Resolve async Server Components explicitly; this is not a Next.js E2E render.
  const shell = await ChairAppShell({ children: page.props.children });
  return createElement(
    PresentationPrivacyProvider,
    { initialEnabled: privacyEnabled },
    shell,
  );
}

async function renderPage(query: PageQuery = {}, privacyEnabled = false) {
  return render(await resolvedPage(query, privacyEnabled));
}

function main() {
  return within(screen.getByRole("main"));
}

function row(name: string) {
  const article = main()
    .getByRole("heading", { level: 3, name })
    .closest("article");
  if (!article) throw new Error("Expected a member review row");
  return within(article);
}

function total(section: string, label: string) {
  const heading = main().getByRole("heading", { name: section });
  const card = heading.parentElement;
  if (!card) throw new Error("Expected a total card");
  const term = within(card).getByText(label, { selector: "dt" });
  return term.nextElementSibling?.textContent;
}

describe("weekly review page", () => {
  it("defaults every week-dependent section to the actual current week", async () => {
    const { container } = await renderPage();
    expect(
      main().getByRole("heading", {
        name: "Current Week 3: Synthetic current week",
      }),
    ).toBeTruthy();
    expect(
      main().getByText("Oct 5, 2026 – Oct 11, 2026 · America/New_York"),
    ).toBeTruthy();
    expect(
      main().getByText(/Grade-check deadline:.*Oct 11, 2026.*7:00 PM EDT/),
    ).toBeTruthy();
    expect(row("Synthetic Partial").getByText("1 hr / 1 hr")).toBeTruthy();
    expect(row("Synthetic Partial").getByText("On Time")).toBeTruthy();
    expect(row("Synthetic Chair").getByText("0 hr 30 min / 3 hr")).toBeTruthy();
    expect(
      row("Synthetic Chair").getByText("Awaiting submission"),
    ).toBeTruthy();
    expect(total("Submission totals", "On Time")).toBe("1");
    expect(total("Submission totals", "Awaiting submission")).toBe("4");
    expect(main().queryByText(/Historical results reflect/)).toBeNull();
    writeBrowserFixture("weekly-review-current.html", container.innerHTML);
  });

  it("switches deadlines, submission timing, stored requirements, totals and rows together for history", async () => {
    const { container } = await renderPage({ week: "2" });
    expect(
      main().getByRole("heading", {
        name: "Viewing historical Week 2: Synthetic previous week",
      }),
    ).toBeTruthy();
    expect(
      main().getByText("Sep 28, 2026 – Oct 4, 2026 · America/New_York"),
    ).toBeTruthy();
    expect(
      main().getByText(/Grade-check deadline:.*Sep 28, 2026.*7:00 PM EDT/),
    ).toBeTruthy();
    expect(
      row("Synthetic Partial").getByText("1 hr / 2 hr 30 min"),
    ).toBeTruthy();
    expect(row("Synthetic Partial").getByText("Short by 90 min")).toBeTruthy();
    expect(row("Synthetic Partial").getByText("Late")).toBeTruthy();
    expect(
      row("Synthetic Partial").getByText(
        /Original submission:.*Sep 28, 2026.*8:00 PM EDT/,
      ),
    ).toBeTruthy();
    expect(row("Synthetic Chair").getByText("3 hr / 3 hr")).toBeTruthy();
    expect(total("Submission totals", "On Time")).toBe("1");
    expect(total("Submission totals", "Late")).toBe("1");
    expect(total("Submission totals", "Eligibility unknown")).toBe("3");
    expect(total("Submission totals", "Missing")).toBe("0");
    expect(total("Study-hour totals", "Incomplete hours")).toBe("2");
    expect(
      main().getByText(
        /Historical results reflect the currently active roster and include subsequent corrections/,
      ),
    ).toBeTruthy();
    expect(
      row("Synthetic Zero Logged").getByText("Eligibility unknown"),
    ).toBeTruthy();
    writeBrowserFixture("weekly-review-history.html", container.innerHTML);
  });

  it("preserves both filters in week navigation and the GET week selector", async () => {
    await renderPage({ week: "2", status: "late", hours: "incomplete" });
    const navigation = main().getByRole("navigation", {
      name: "Academic week navigation",
    });
    expect(
      within(navigation)
        .getByRole("link", { name: "← Previous week" })
        .getAttribute("href"),
    ).toBe("/this-week?week=1&status=late&hours=incomplete");
    expect(
      within(navigation)
        .getByRole("link", { name: "Next week →" })
        .getAttribute("href"),
    ).toBe("/this-week?week=3&status=late&hours=incomplete");
    expect(
      within(navigation)
        .getByRole("link", { name: "Return to current week" })
        .getAttribute("href"),
    ).toBe("/this-week?week=3&status=late&hours=incomplete");
    const selector = main().getByRole("combobox", { name: "Academic week" });
    if (!(selector instanceof HTMLSelectElement) || !selector.form)
      throw new Error("Expected the week selection form");
    expect(selector.form.method).toBe("get");
    expect(selector.form.getAttribute("action")).toBe("/this-week");
    expect(Object.fromEntries(new FormData(selector.form))).toEqual({
      week: "2",
      status: "late",
      hours: "incomplete",
    });
    expect(
      within(selector).queryByRole("option", { name: /Week 4/ }),
    ).toBeNull();
    expect(
      main()
        .getByRole("link", {
          name: "Member profile (current week): Synthetic Partial",
        })
        .getAttribute("href"),
    ).toBe("/members/synthetic-partial");
  });

  it("keeps the week selector synchronized across historical and current page transitions", async () => {
    const view = await renderPage();
    const selectedValue = () => {
      const selector = main().getByRole("combobox", { name: "Academic week" });
      if (!(selector instanceof HTMLSelectElement))
        throw new Error("Expected an academic week selector");
      return selector.value;
    };
    expect(selectedValue()).toBe("3");

    // Preserve provider/shell identity as a client-side route transition does.
    view.rerender(await resolvedPage({ week: "2" }));
    expect(
      main().getByRole("heading", {
        name: "Viewing historical Week 2: Synthetic previous week",
      }),
    ).toBeTruthy();
    expect(selectedValue()).toBe("2");

    view.rerender(await resolvedPage({ week: "3" }));
    expect(
      main().getByRole("heading", {
        name: "Current Week 3: Synthetic current week",
      }),
    ).toBeTruthy();
    expect(selectedValue()).toBe("3");
  });

  it("uses the immediately preceding academic week even when its grade check was skipped", async () => {
    const previousWeek = fixture.tables.academic_weeks?.find(
      (week) => week.id === "synthetic-week-2",
    );
    if (!previousWeek) throw new Error("Expected the previous synthetic week");
    previousWeek.grade_check_required = false;
    await renderPage();
    const shortcut = main().getByRole("link", {
      name: "Last week → Incomplete hours",
    });
    expect(shortcut.getAttribute("href")).toBe(
      "/this-week?week=2&hours=incomplete",
    );
    cleanup();
    const { container } = await renderPage({ week: "2", hours: "incomplete" });
    expect(
      main().getByRole("heading", {
        name: "Viewing historical Week 2: Synthetic previous week",
      }),
    ).toBeTruthy();
    expect(main().getByText("No grade check required this week.")).toBeTruthy();
    expect(
      main().getByText(
        "Stored study-hour requirements and sessions still apply.",
      ),
    ).toBeTruthy();
    expect(
      row("Synthetic Partial").getByText("1 hr / 2 hr 30 min"),
    ).toBeTruthy();
    expect(row("Synthetic Zero Logged").getByText("0 hr / 1 hr")).toBeTruthy();
    expect(
      row("Synthetic Partial").getByText("No grade check required"),
    ).toBeTruthy();
    expect(
      main().queryByRole("heading", { name: "Synthetic Chair", level: 3 }),
    ).toBeNull();
    expect(
      main().getByText(/Showing 2 of 5 currently active members/),
    ).toBeTruthy();
    writeBrowserFixture(
      "weekly-review-last-week-incomplete.html",
      container.innerHTML,
    );
  });

  it("combines filters consistently and exposes the selected filter semantics", async () => {
    const { container } = await renderPage({
      week: "2",
      status: "late",
      hours: "incomplete",
    });
    const submissionFilters = main().getByRole("navigation", {
      name: "Submission status filters",
    });
    const hourFilters = main().getByRole("navigation", {
      name: "Study-hour filters",
    });
    expect(
      within(submissionFilters)
        .getByRole("link", { name: "Late (1)" })
        .getAttribute("aria-current"),
    ).toBe("true");
    expect(
      within(submissionFilters).getByRole("link", { name: "On Time (0)" }),
    ).toBeTruthy();
    expect(
      within(submissionFilters).getByRole("link", {
        name: "All submissions (2)",
      }),
    ).toBeTruthy();
    expect(
      within(hourFilters)
        .getByRole("link", { name: "Incomplete hours (1)" })
        .getAttribute("aria-current"),
    ).toBe("true");
    expect(
      within(hourFilters).getByRole("link", { name: "Not assigned (0)" }),
    ).toBeTruthy();
    expect(
      within(hourFilters)
        .getByRole("link", { name: "All hour statuses (1)" })
        .getAttribute("href"),
    ).toBe("/this-week?week=2&status=late");
    expect(
      main().getByText(
        /Showing 1 of 5 currently active members\. Submission: Late\. Study hours: Incomplete hours\. Filters combine/,
      ),
    ).toBeTruthy();
    expect(
      main()
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["Synthetic Partial"]);
    writeBrowserFixture(
      "weekly-review-combined-filters.html",
      container.innerHTML,
    );
  });

  it("keeps zero logged positive requirements incomplete but separates explicit zero and missing assignments", async () => {
    await renderPage({ week: "2" });
    expect(row("Synthetic Zero Logged").getByText("0 hr / 1 hr")).toBeTruthy();
    expect(
      row("Synthetic Zero Logged").getByText("Short by 60 min"),
    ).toBeTruthy();
    expect(
      row("Synthetic Zero Logged").getByText("Incomplete hours"),
    ).toBeTruthy();
    expect(row("Synthetic Exempt").getByText("0 hr / 0 hr")).toBeTruthy();
    expect(row("Synthetic Exempt").getByText("Not required")).toBeTruthy();
    expect(
      row("Synthetic Unassigned").getByText("0 hr / Not assigned"),
    ).toBeTruthy();
    expect(row("Synthetic Unassigned").queryByText(/short/i)).toBeNull();
    expect(total("Study-hour totals", "Not required")).toBe("1");
    expect(total("Study-hour totals", "Not assigned")).toBe("1");
    cleanup();
    await renderPage({ week: "2", hours: "not_assigned" });
    expect(
      main()
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["Synthetic Unassigned"]);
  });

  it("excludes currently inactive, alumni and foreign chapter members from historical rows and totals", async () => {
    await renderPage({ week: "2" });
    expect(main().getAllByRole("heading", { level: 3 })).toHaveLength(5);
    expect(main().queryByText("Synthetic Inactive")).toBeNull();
    expect(main().queryByText("Synthetic Alumni")).toBeNull();
    expect(main().queryByText("Synthetic Foreign")).toBeNull();
    expect(
      main().getByText(/Showing 5 of 5 currently active members/),
    ).toBeTruthy();
    expect(total("Study-hour totals", "Incomplete hours")).toBe("2");
  });

  it("renders historical browsing without save, correction, refresh or requirement management controls", async () => {
    const { container } = await renderPage({ week: "2" });
    expect(main().getByText(/Historical browsing is read-only/)).toBeTruthy();
    expect(
      main()
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["View week"]);
    expect(
      [...screen.getByRole("main").querySelectorAll("form")].map(
        (form) => form.method,
      ),
    ).toEqual(["get"]);
    expect(
      main().queryByRole("link", {
        name: /Manage requirement|Correct|Override|Refresh/,
      }),
    ).toBeNull();
    expect(
      container.querySelector(
        'input[name="assignmentId"], input[name="sessionId"]',
      ),
    ).toBeNull();
    expect(
      main().getAllByRole("link", { name: /Member profile \(current week\)/ }),
    ).toHaveLength(5);
  });

  it("clearly handles the first academic week without substituting a last-week shortcut", async () => {
    vi.setSystemTime(new Date("2026-09-22T16:00:00Z"));
    await renderPage();
    expect(
      main().getByRole("heading", {
        name: "Current Week 1: Synthetic first week",
      }),
    ).toBeTruthy();
    expect(main().getByText("First academic week")).toBeTruthy();
    expect(
      main().getByText("No previous academic week is available."),
    ).toBeTruthy();
    expect(
      main().queryByRole("link", { name: "Last week → Incomplete hours" }),
    ).toBeNull();
    expect(main().queryByRole("link", { name: "Next week →" })).toBeNull();
  });

  it.each(["4", "synthetic-week-2", "-1"])(
    "rejects unavailable or invalid week %s without displaying another week's records",
    async (week) => {
      await renderPage({ week });
      expect(
        main().getByRole("heading", { name: "Weekly view unavailable" }),
      ).toBeTruthy();
      expect(
        main().queryByRole("region", { name: "Selected-week totals" }),
      ).toBeNull();
      expect(main().queryByRole("heading", { level: 3 })).toBeNull();
      expect(
        main().getByRole("link", { name: "Current week" }).getAttribute("href"),
      ).toBe("/this-week");
    },
  );

  it("does not substitute history when no current academic week is configured", async () => {
    vi.setSystemTime(new Date("2026-10-20T16:00:00Z"));
    await renderPage({ week: "2" });
    expect(
      main().getByText(
        "No current academic week is configured. No other week has been substituted.",
      ),
    ).toBeTruthy();
    expect(
      main().queryByRole("heading", { name: /Viewing historical/ }),
    ).toBeNull();
  });

  it("hides filtered member identities, links, counts and status text while presentation privacy is enabled", async () => {
    const { container } = await renderPage(
      { week: "2", hours: "incomplete" },
      true,
    );
    expect(main().queryByText("Synthetic Partial")).toBeNull();
    expect(main().queryByText("Synthetic Zero Logged")).toBeNull();
    expect(main().queryByRole("link", { name: /Member profile/ })).toBeNull();
    expect(
      main().queryByRole("navigation", { name: "Study-hour filters" }),
    ).toBeNull();
    expect(
      main().queryByRole("region", { name: "Selected-week totals" }),
    ).toBeNull();
    expect(
      main().queryByText(/Showing \d|Short by|1 hr \/|Eligibility unknown/),
    ).toBeNull();
    expect(
      main().getByRole("img", { name: "Hidden in presentation privacy mode." }),
    ).toBeTruthy();
    expect(
      main().getByRole("combobox", { name: "Academic week" }),
    ).toBeTruthy();
    expect(
      main().getByRole("link", { name: "Return to current week" }),
    ).toBeTruthy();
    writeBrowserFixture("weekly-review-privacy.html", container.innerHTML);
  });

  it("does not disclose an empty academic-filter result in presentation privacy mode", async () => {
    await renderPage(
      { week: "2", status: "on_time", hours: "incomplete" },
      true,
    );
    expect(
      main().queryByText(
        "No currently active members match both filters for this week.",
      ),
    ).toBeNull();
    expect(main().queryByText(/Showing 0|On Time \(0\)/)).toBeNull();
    expect(
      main().getByRole("img", { name: "Hidden in presentation privacy mode." }),
    ).toBeTruthy();
  });

  it("masks filtered identities and empty states during unresolved server rendering even with privacy initially off", async () => {
    const markup = renderToStaticMarkup(
      await resolvedPage({ week: "2", hours: "incomplete" }),
    );
    expect(markup).toContain("Hidden in presentation privacy mode.");
    expect(markup).not.toContain("Synthetic Partial");
    expect(markup).not.toContain("Synthetic Zero Logged");
    expect(markup).not.toContain("/members/synthetic-partial");
    expect(markup).not.toContain("Selected-week totals");
    expect(markup).not.toContain("Short by 90 min");
    expect(markup).not.toContain("Showing 2 of 5");
    const emptyMarkup = renderToStaticMarkup(
      await resolvedPage({ week: "2", status: "on_time", hours: "incomplete" }),
    );
    expect(emptyMarkup).not.toContain(
      "No currently active members match both filters",
    );
    expect(emptyMarkup).not.toContain("Showing 0");
  });

  it("masks existing filtered results immediately when privacy is toggled and restores them when disabled", async () => {
    await renderPage({ week: "2", status: "late", hours: "incomplete" });
    expect(
      main().getByRole("heading", { name: "Synthetic Partial", level: 3 }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("switch", { name: "Presentation privacy mode" }),
    );
    expect(
      main().queryByRole("heading", { name: "Synthetic Partial", level: 3 }),
    ).toBeNull();
    expect(main().queryByRole("link", { name: /Member profile/ })).toBeNull();
    expect(main().queryByText(/Showing 1 of 5/)).toBeNull();
    expect(
      main().getByRole("img", { name: "Hidden in presentation privacy mode." }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Turn it off" }));
    expect(
      main().getByRole("heading", { name: "Synthetic Partial", level: 3 }),
    ).toBeTruthy();
    expect(main().getByText(/Showing 1 of 5/)).toBeTruthy();
  });
});
