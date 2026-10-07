// @vitest-environment jsdom

import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ThisWeekPage from "@/app/this-week/page";
import { ChairAppShell } from "@/components/chair-app-shell";
import { PresentationPrivacyProvider } from "@/components/presentation-privacy";
import type { SyntheticTables } from "../support/synthetic-chair";
import { writeBrowserFixture } from "../support/browser-fixture";

const fixture = vi.hoisted(() => ({ tables: {} as SyntheticTables }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/this-week",
  useRouter: () => ({ refresh: vi.fn() }),
  redirect: (path: string) => {
    throw new Error(`Unexpected redirect: ${path}`);
  },
}));
vi.mock("@/lib/supabase/server", async () => {
  const { createSyntheticChairClient } =
    await import("../support/synthetic-chair");
  return {
    createClient: async () => createSyntheticChairClient(fixture.tables),
  };
});

beforeEach(() => {
  fixture.tables = {};
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-06T16:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function renderMissingList(initialEnabled = false) {
  const page = await ThisWeekPage({
    searchParams: Promise.resolve({ status: "missing" }),
  });
  const shell = await ChairAppShell({ children: page.props.children });
  return render(
    createElement(PresentationPrivacyProvider, { initialEnabled }, shell),
  );
}

it("does not claim everyone submitted when unsubmitted members are still awaiting the deadline", async () => {
  const { container } = await renderMissingList();
  expect(
    screen.getByText(
      "No missing check-ins. 2 members are still awaiting submission.",
    ),
  ).toBeTruthy();
  expect(
    screen.queryByText("Everyone has submitted a check-in this week."),
  ).toBeNull();
  writeBrowserFixture("weekly-awaiting.html", container.innerHTML);
});

it("explains that no check-in is required instead of reporting submission success", async () => {
  fixture.tables.academic_weeks = [
    {
      id: "synthetic-week",
      semester_id: "synthetic-semester",
      sequence_number: 1,
      label: "Synthetic Week",
      starts_on: "2026-10-05",
      ends_on: "2026-10-11",
      deadline_at: "2026-10-11T23:00:00Z",
      grade_check_required: false,
    },
  ];
  const { container } = await renderMissingList();
  expect(
    screen.getByText("No grade check is required this week."),
  ).toBeTruthy();
  expect(
    screen.queryByText("Everyone has submitted a check-in this week."),
  ).toBeNull();
  writeBrowserFixture("weekly-not-required.html", container.innerHTML);
});

it("uses singular wording when one member is awaiting submission", async () => {
  fixture.tables.grade_submissions = [
    {
      member_id: "synthetic-member-1",
      week_id: "synthetic-week",
      is_current: true,
      original_timing: "on_time",
    },
  ];
  await renderMissingList();
  expect(
    screen.getByText(
      "No missing check-ins. 1 member is still awaiting submission.",
    ),
  ).toBeTruthy();
});

it("keeps awaiting counts hidden in presentation privacy mode", async () => {
  await renderMissingList(true);
  expect(
    screen.queryByText(
      "No missing check-ins. 2 members are still awaiting submission.",
    ),
  ).toBeNull();
  expect(
    screen.getAllByRole("img", { name: "Hidden in presentation privacy mode." })
      .length,
  ).toBeGreaterThan(0);
});
