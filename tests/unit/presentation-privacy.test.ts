// @vitest-environment jsdom

import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  PresentationPrivacyControls,
  PresentationPrivacyProvider,
  PrivacyActionGuard,
  PrivacySensitive,
} from "@/components/presentation-privacy";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh, replace: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  document.cookie = "sigma_nu_presentation_privacy=; Max-Age=0; Path=/";
  refresh.mockReset();
});

function renderPrivacy(initialEnabled = false) {
  return render(
    createElement(
      PresentationPrivacyProvider,
      { initialEnabled } as { initialEnabled: boolean },
      createElement(
        "main",
        null,
        createElement(PresentationPrivacyControls, { canToggle: true }),
        createElement(PrivacySensitive, null, "Synthetic GPA 3.75"),
        createElement(
          PrivacyActionGuard,
          null,
          createElement("button", { type: "button" }, "Export"),
        ),
      ),
    ),
  );
}

describe("presentation privacy mode", () => {
  it("masks sensitive content until the tab preference resolves and toggles persistently", async () => {
    renderPrivacy();

    await waitFor(() =>
      expect(screen.getByText("Synthetic GPA 3.75")).toBeTruthy(),
    );

    fireEvent.click(
      screen.getByRole("switch", { name: "Presentation privacy mode" }),
    );
    expect(sessionStorage.getItem("sigma-nu-presentation-privacy")).toBe("on");
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.getByText("Presentation privacy mode is on")).toBeTruthy();
    expect(screen.queryByText("Synthetic GPA 3.75")).toBeNull();
    expect(
      screen.getByText("Turn off presentation privacy to use this action."),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Turn it off" }));
    expect(sessionStorage.getItem("sigma-nu-presentation-privacy")).toBe("off");
    expect(screen.getByText("Synthetic GPA 3.75")).toBeTruthy();
  });

  it("does not expose the control when the caller is not permitted to toggle it", async () => {
    const view = render(
      createElement(
        PresentationPrivacyProvider,
        { initialEnabled: false } as { initialEnabled: boolean },
        createElement(PresentationPrivacyControls, { canToggle: false }),
      ),
    );
    await waitFor(() => expect(view.container).toBeTruthy());
    expect(
      screen.queryByRole("switch", { name: "Presentation privacy mode" }),
    ).toBeNull();
  });

  it("restores the enabled state from the current browser tab", async () => {
    sessionStorage.setItem("sigma-nu-presentation-privacy", "on");
    renderPrivacy();

    await waitFor(() =>
      expect(screen.getByText("Presentation privacy mode is on")).toBeTruthy(),
    );
    expect(
      screen
        .getByRole("switch", { name: "Presentation privacy mode" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });
});
