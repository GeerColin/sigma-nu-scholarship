// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { AppShell } from "@/components/app-shell";
import { PresentationPrivacyProvider } from "@/components/presentation-privacy";
import { writeBrowserFixture } from "../support/browser-fixture";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(cleanup);

it("keeps workspace choices and sign-out inside the mobile navigation menu", () => {
  const { container } = render(
    <PresentationPrivacyProvider initialEnabled={false}>
      <AppShell
        viewer={{
          name: "Synthetic Chair",
          email: "synthetic-chair@example.invalid",
          role: "Scholarship Chair",
          workspace: "chair",
          canChair: true,
          canProctor: true,
          canPrivacy: true,
        }}
        chapter={null}
        academicPeriod={null}
      >
        <h1>Synthetic dashboard</h1>
      </AppShell>
    </PresentationPrivacyProvider>,
  );
  fireEvent.click(screen.getByLabelText("Open navigation"));
  const menu = screen.getByRole("navigation", {
    name: "All administration pages",
  });
  expect(within(menu).getByText("Member view")).toBeTruthy();
  expect(within(menu).getByText("Proctor view")).toBeTruthy();
  expect(within(menu).getByText("Scholarship Chair view")).toBeTruthy();
  expect(within(menu).getByRole("button", { name: "Sign out" })).toBeTruthy();
  expect(
    screen.getByRole("switch", { name: "Presentation privacy mode" }),
  ).toBeTruthy();
  writeBrowserFixture("header.html", container.innerHTML);
});
