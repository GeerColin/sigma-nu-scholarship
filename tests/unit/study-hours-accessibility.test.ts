// @vitest-environment jsdom

import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import StudyHoursPage from "@/app/study-hours/page";
import { ChairAppShell } from "@/components/chair-app-shell";
import { PresentationPrivacyProvider } from "@/components/presentation-privacy";
import { writeBrowserFixture } from "../support/browser-fixture";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/study-hours",
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  redirect: (destination: string) => {
    throw new Error(`Unexpected redirect to ${destination}`);
  },
}));

vi.mock("@/lib/supabase/server", async () => {
  const { createSyntheticChairClient } =
    await import("../support/synthetic-chair");
  return { createClient: async () => createSyntheticChairClient() };
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-06T16:00:00Z"));
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.useRealTimers();
});

async function renderStudyHours(privacyEnabled = false) {
  const page = await StudyHoursPage({ searchParams: Promise.resolve({}) });
  // Resolve the async Server Component shell as Next.js does before hydration.
  const shell = await ChairAppShell({ children: page.props.children });
  const view = render(
    createElement(
      PresentationPrivacyProvider,
      { initialEnabled: privacyEnabled },
      shell,
    ),
  );
  if (!privacyEnabled) {
    for (const summary of screen.getAllByText("Manage", {
      selector: "summary",
    })) {
      fireEvent.click(summary);
    }
  }
  writeBrowserFixture(
    privacyEnabled ? "study-hours-privacy.html" : "study-hours.html",
    view.container.innerHTML,
  );
  return view;
}

describe("study-hour management accessible fields", () => {
  it("gives each override-removal reason a visible label while preserving its form contract", async () => {
    await renderStudyHours();
    const removalReasons = screen.getAllByRole("textbox", {
      name: /^Reason for removal for Synthetic (Chair|Member)$/,
    });
    expect(removalReasons).toHaveLength(2);
    for (const reason of removalReasons) {
      expect(reason).toBeInstanceOf(HTMLInputElement);
      if (!(reason instanceof HTMLInputElement) || !reason.form)
        throw new Error("Removal reason must belong to its form");
      expect(reason.labels?.[0]?.textContent).toContain("Reason for removal");
      expect(reason.labels?.[0]?.htmlFor).toBe(reason.id);
      expect(reason.required).toBe(true);
      expect(reason.minLength).toBe(2);
      expect(reason.maxLength).toBe(500);
      expect(reason.name).toBe("reason");
      expect(
        within(reason.form).getByRole("checkbox").getAttribute("name"),
      ).toBe("confirmed");
      expect(
        within(reason.form).getByRole("button", { name: "Remove override" }),
      ).toBeTruthy();
    }
    expect(new Set(removalReasons.map((reason) => reason.id)).size).toBe(2);
  });

  it("labels each review decision and reason without changing the submitted assignment decision", async () => {
    await renderStudyHours();
    const decisions = screen.getAllByRole("combobox", {
      name: /^Review decision for Synthetic (Chair|Member)$/,
    });
    expect(decisions).toHaveLength(2);
    for (const [index, decision] of decisions.entries()) {
      if (!(decision instanceof HTMLSelectElement) || !decision.form)
        throw new Error("Review decision must belong to its form");
      expect(decision.labels?.[0]?.textContent).toContain("Review decision");
      expect(decision.labels?.[0]?.htmlFor).toBe(decision.id);
      expect(decision.value).toBe("keep");
      const reason = within(decision.form).getByRole("textbox", {
        name: /^Decision reason for Synthetic (Chair|Member)$/,
      });
      if (!(reason instanceof HTMLInputElement))
        throw new Error("Decision reason must be a text input");
      expect(reason.labels?.[0]?.textContent).toContain("Decision reason");
      expect(reason.labels?.[0]?.htmlFor).toBe(reason.id);
      expect(reason.required).toBe(true);
      expect(reason.minLength).toBe(2);
      expect(reason.maxLength).toBe(500);
      fireEvent.change(decision, { target: { value: "update" } });
      fireEvent.change(reason, {
        target: { value: "Synthetic review reason" },
      });
      expect(Object.fromEntries(new FormData(decision.form))).toEqual({
        assignmentId: `synthetic-assignment-${index + 1}`,
        decision: "update",
        reason: "Synthetic review reason",
      });
    }
    expect(new Set(decisions.map((decision) => decision.id)).size).toBe(2);
  });

  it("keeps assignment management labels and inputs absent in presentation privacy mode", async () => {
    await renderStudyHours(true);
    expect(
      screen.queryByRole("combobox", { name: /Review decision/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("textbox", {
        name: /Reason for removal|Decision reason/,
      }),
    ).toBeNull();
    expect(screen.queryByText("Synthetic adjustment")).toBeNull();
    expect(screen.queryByRole("button", { name: "Resolve review" })).toBeNull();
    expect(
      screen.getAllByText(
        "Turn off presentation privacy to manage study-hour assignments.",
      ),
    ).toHaveLength(2);
  });
});
