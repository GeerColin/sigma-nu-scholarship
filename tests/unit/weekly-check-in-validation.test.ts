// @vitest-environment jsdom

import { Component, createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { writeBrowserFixture } from "../support/browser-fixture";

const boundaries = vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://synthetic.supabase.co");
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "sb_publishable_synthetic_test",
  );
  return {
    authorize: vi.fn(async () => ({})),
    rpc: vi.fn(async (): Promise<{ error: { message: string } | null }> => ({
      error: null,
    })),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/guards", () => ({
  requireApprovedMemberContext: boundaries.authorize,
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ rpc: boundaries.rpc }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  redirect: (destination: string): never => {
    throw new Error(`Synthetic redirect: ${destination}`);
  },
}));

import { WeeklyCheckInForm } from "@/features/grades/weekly-check-in-form";
import { submitWeeklyCheckIn } from "@/features/grades/actions";

describe("letter-grade check-in entry and revisions", () => {
  it("offers exactly the supported grades in descending order, without changing Pass/Fail", () => {
    render(
      createElement(WeeklyCheckInForm, {
        weekId,
        courses: [
          {
            id: courseId,
            name: "Synthetic Letter",
            gradingType: "letter",
            previousValue: null,
          },
          {
            id: "20000000-0000-4000-8000-000000000002",
            name: "Synthetic Pass Fail",
            gradingType: "pass_fail",
            previousValue: "Pass",
          },
        ],
      }),
    );
    const letters = screen.getByRole("combobox", {
      name: "Current standing for Synthetic Letter",
    }) as HTMLSelectElement;
    expect([...letters.options].map((option) => option.value)).toEqual([
      "",
      "A",
      "B+",
      "B",
      "C+",
      "C",
      "D+",
      "D",
      "F",
    ]);
    const passFail = screen.getByRole("combobox", {
      name: "Current standing for Synthetic Pass Fail",
    }) as HTMLSelectElement;
    expect([...passFail.options].map((option) => option.value)).toEqual([
      "",
      "Pass",
      "Fail",
    ]);
  });

  it.each(["B+", "C+", "D+"])(
    "prepopulates %s from the previous week and the current revision",
    (grade) => {
      const props = {
        weekId,
        courses: [
          {
            id: courseId,
            name: "Synthetic Letter",
            gradingType: "letter" as const,
            previousValue: grade,
          },
        ],
      };
      render(createElement(WeeklyCheckInForm, props));
      expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
        grade,
      );
      cleanup();
      render(createElement(WeeklyCheckInForm, { ...props, isRevision: true }));
      expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
        grade,
      );
      expect(screen.getByText(`Current submission: ${grade}`)).toBeTruthy();
    },
  );

  it("normalizes a supported direct-RPC plus value when prepopulating", () => {
    render(
      createElement(WeeklyCheckInForm, {
        weekId,
        isRevision: true,
        courses: [
          {
            id: courseId,
            name: "Synthetic Letter",
            gradingType: "letter",
            previousValue: " b+ ",
          },
        ],
      }),
    );
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
      "B+",
    );
  });

  it("retains an edited plus grade after client comment validation fails", () => {
    const { container } = render(
      createElement(WeeklyCheckInForm, {
        weekId,
        isRevision: true,
        courses: [
          {
            id: courseId,
            name: "Synthetic Letter",
            gradingType: "letter",
            previousValue: "B+",
          },
        ],
      }),
    );
    const letter = screen.getByRole("combobox");
    fireEvent.change(letter, { target: { value: "D+" } });
    fireEvent.change(screen.getByLabelText(/Anything you want to explain/), {
      target: { value: thirtyOneWords },
    });
    fireEvent.submit(container.querySelector("form")!);
    expect(screen.getByRole("alert").textContent).toContain(
      "30 words or fewer",
    );
    expect((letter as HTMLSelectElement).value).toBe("D+");
    expect(
      JSON.parse(
        (container.querySelector('input[name="entries"]') as HTMLInputElement)
          .value,
      ),
    ).toEqual([{ courseId, value: "D+" }]);
    expect(boundaries.rpc).not.toHaveBeenCalled();
  });

  it("preserves plus selections on an RPC error and submits the edited plus value on retry", async () => {
    boundaries.rpc.mockResolvedValue({
      error: { message: "Synthetic save failure" },
    });
    const view = render(
      createElement(
        SyntheticRedirectBoundary,
        null,
        createElement(WeeklyCheckInForm, {
          weekId,
          isRevision: true,
          initialComment: "Synthetic revision",
          courses: [
            {
              id: courseId,
              name: "Synthetic Letter",
              gradingType: "letter",
              previousValue: "B+",
            },
          ],
        }),
      ),
    );
    const letter = screen.getByRole("combobox");
    fireEvent.change(letter, { target: { value: "C+" } });
    expect((letter as HTMLSelectElement).value).toBe("C+");
    fireEvent.submit(view.container.querySelector("form")!);
    expect((await screen.findByRole("alert")).textContent).toBe(
      "We couldn’t submit your grades. Nothing was recorded. Try again. If this continues, contact the Scholarship Chair.",
    );
    expect((letter as HTMLSelectElement).value).toBe("C+");
    expect(boundaries.rpc).toHaveBeenLastCalledWith("submit_weekly_checkin", {
      target_week_id: weekId,
      submitted_entries: [{ courseId, value: "C+" }],
      submission_comment: "Synthetic revision",
    });
    boundaries.rpc.mockResolvedValue({ error: null });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      fireEvent.change(letter, { target: { value: "D+" } });
      fireEvent.submit(view.container.querySelector("form")!);
      await screen.findByText(
        "Synthetic redirect: /member/check-in?status=submitted",
      );
      expect(boundaries.rpc).toHaveBeenLastCalledWith("submit_weekly_checkin", {
        target_week_id: weekId,
        submitted_entries: [{ courseId, value: "D+" }],
        submission_comment: "Synthetic revision",
      });
    } finally {
      consoleError.mockRestore();
    }
  });

  it("exports a clearly synthetic plus-grade revision browser fixture", () => {
    const { container } = render(
      createElement(WeeklyCheckInForm, {
        weekId,
        isRevision: true,
        initialComment: "Synthetic exam context",
        courses: [
          {
            id: courseId,
            name: "Synthetic Letter Course",
            gradingType: "letter",
            previousValue: "B+",
          },
          {
            id: "20000000-0000-4000-8000-000000000002",
            name: "Synthetic Percentage Course",
            gradingType: "percentage",
            previousValue: 89.9,
          },
        ],
      }),
    );
    if (process.env.UX_FIXTURE_OUTPUT_DIR) {
      const snapshot = container.cloneNode(true) as HTMLElement;
      const select = snapshot.querySelector("select")!;
      for (const option of select.options)
        option.toggleAttribute("selected", option.value === "B+");
      snapshot.querySelector("textarea")!.textContent =
        "Synthetic exam context";
      writeBrowserFixture("plus-grade-revision.html", snapshot.innerHTML);
    }
  });
});

const thirtyWords =
  "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty-one twenty-two twenty-three twenty-four twenty-five twenty-six twenty-seven twenty-eight twenty-nine thirty";
const thirtyOneWords = `${thirtyWords} thirty-one`;
const weekId = "10000000-0000-4000-8000-000000000001";
const courseId = "20000000-0000-4000-8000-000000000001";

class SyntheticRedirectBoundary extends Component<
  { children: ReactNode },
  { destination: string | null }
> {
  override state = { destination: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { destination: error.message };
  }
  override render() {
    return this.state.destination
      ? createElement("p", { role: "status" }, this.state.destination)
      : this.props.children;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  boundaries.authorize.mockResolvedValue({});
  boundaries.rpc.mockResolvedValue({ error: null });
});
afterEach(cleanup);

describe("weekly check-in comment feedback", () => {
  it("explains a 31-word comment inline, focuses it on submit, and preserves entered grades", async () => {
    const { container } = render(
      createElement(WeeklyCheckInForm, {
        weekId,
        courses: [
          {
            id: courseId,
            name: "Synthetic Calculus",
            gradingType: "percentage",
            previousValue: 85,
          },
        ],
      }),
    );
    const grade = screen.getByRole("spinbutton", {
      name: "Current standing for Synthetic Calculus",
    });
    const comment = screen.getByLabelText(
      /Anything you want to explain about these grades/i,
    );
    fireEvent.change(grade, { target: { value: "91" } });
    fireEvent.change(comment, { target: { value: thirtyOneWords } });

    expect(screen.getByRole("alert").textContent).toBe(
      "Use 30 words or fewer for your comment.",
    );
    expect(comment.getAttribute("aria-invalid")).toBe("true");
    expect(comment.getAttribute("aria-describedby")?.split(" ")).toContain(
      screen.getByRole("alert").id,
    );
    fireEvent.submit(container.querySelector("form")!);
    expect(document.activeElement).toBe(comment);
    expect((grade as HTMLInputElement).value).toBe("91");
    expect((comment as HTMLTextAreaElement).value).toBe(thirtyOneWords);
    expect(boundaries.rpc).not.toHaveBeenCalled();
    if (process.env.UX_FIXTURE_OUTPUT_DIR) {
      const snapshot = container.cloneNode(true) as HTMLElement;
      snapshot.querySelector("textarea")!.textContent = (
        comment as HTMLTextAreaElement
      ).value;
      await writeBrowserFixture("grades.html", snapshot.innerHTML);
    }
  });

  it("returns a specific server comment error instead of navigating away or recording grades", async () => {
    const formData = new FormData();
    formData.set("weekId", weekId);
    formData.set("entries", JSON.stringify([{ courseId, value: 91 }]));
    formData.set("submissionComment", thirtyOneWords);

    await expect(submitWeeklyCheckIn({}, formData)).resolves.toEqual({
      commentError: "Use 30 words or fewer for your comment.",
    });
    expect(boundaries.rpc).not.toHaveBeenCalled();
  });

  it("keeps the grade and comment draft when the server rejects other validation", async () => {
    const { container } = render(
      createElement(WeeklyCheckInForm, {
        weekId: "synthetic-invalid-week",
        courses: [
          {
            id: courseId,
            name: "Synthetic Calculus",
            gradingType: "percentage",
            previousValue: 85,
          },
        ],
      }),
    );
    const grade = screen.getByRole("spinbutton");
    const comment = screen.getByLabelText(
      /Anything you want to explain about these grades/i,
    );
    fireEvent.change(grade, { target: { value: "91" } });
    fireEvent.change(comment, { target: { value: "Synthetic exam context" } });
    fireEvent.submit(container.querySelector("form")!);

    const message = await screen.findByRole("alert");
    expect(message.textContent).toBe(
      "Nothing was recorded. Check every active course and try again.",
    );
    await waitFor(() => expect(document.activeElement).toBe(message));
    expect((grade as HTMLInputElement).value).toBe("91");
    expect((comment as HTMLTextAreaElement).value).toBe(
      "Synthetic exam context",
    );
    expect(boundaries.rpc).not.toHaveBeenCalled();
    if (process.env.UX_FIXTURE_OUTPUT_DIR) {
      const snapshot = container.cloneNode(true) as HTMLElement;
      snapshot.querySelector("textarea")!.textContent = (
        comment as HTMLTextAreaElement
      ).value;
      await writeBrowserFixture("grades-server-error.html", snapshot.innerHTML);
    }
  });

  it("allows a corrected 30-word comment to record the entered grade and use the existing success destination", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const { container } = render(
        createElement(
          SyntheticRedirectBoundary,
          null,
          createElement(WeeklyCheckInForm, {
            weekId,
            courses: [
              {
                id: courseId,
                name: "Synthetic Calculus",
                gradingType: "percentage",
                previousValue: 85,
              },
            ],
          }),
        ),
      );
      const comment = screen.getByLabelText(
        /Anything you want to explain about these grades/i,
      );
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "91" },
      });
      fireEvent.change(comment, { target: { value: thirtyOneWords } });
      expect(screen.getByRole("alert")).toBeTruthy();
      fireEvent.change(comment, { target: { value: thirtyWords } });
      expect(screen.queryByRole("alert")).toBeNull();
      expect(comment.getAttribute("aria-invalid")).toBe("false");
      fireEvent.submit(container.querySelector("form")!);

      expect((await screen.findByRole("status")).textContent).toBe(
        "Synthetic redirect: /member/check-in?status=submitted",
      );
      expect(boundaries.rpc).toHaveBeenCalledWith("submit_weekly_checkin", {
        target_week_id: weekId,
        submitted_entries: [{ courseId, value: 91 }],
        submission_comment: thirtyWords,
      });
    } finally {
      consoleError.mockRestore();
    }
  });

  it("authenticates before responding to invalid submission data", async () => {
    boundaries.authorize.mockRejectedValueOnce(
      new Error("Synthetic sign-in required"),
    );
    const formData = new FormData();
    formData.set("entries", "not JSON");
    formData.set("submissionComment", thirtyOneWords);
    await expect(submitWeeklyCheckIn({}, formData)).rejects.toThrow(
      "Synthetic sign-in required",
    );
    expect(boundaries.rpc).not.toHaveBeenCalled();
  });

  it("enforces the existing 1,000-character comment limit on the server", async () => {
    const formData = new FormData();
    formData.set("weekId", weekId);
    formData.set("entries", JSON.stringify([{ courseId, value: 91 }]));
    formData.set("submissionComment", "a".repeat(1001));
    await expect(submitWeeklyCheckIn({}, formData)).resolves.toEqual({
      commentError: "Use 1,000 characters or fewer for your comment.",
    });
    expect(boundaries.rpc).not.toHaveBeenCalled();
  });

  it.each([undefined, "", "   "])(
    "keeps an omitted or blank optional comment as null",
    async (comment) => {
      const formData = new FormData();
      formData.set("weekId", weekId);
      formData.set("entries", JSON.stringify([{ courseId, value: 91 }]));
      if (comment !== undefined) formData.set("submissionComment", comment);
      await expect(submitWeeklyCheckIn({}, formData)).rejects.toThrow(
        "Synthetic redirect: /member/check-in?status=submitted",
      );
      expect(boundaries.rpc).toHaveBeenCalledWith("submit_weekly_checkin", {
        target_week_id: weekId,
        submitted_entries: [{ courseId, value: 91 }],
        submission_comment: null,
      });
    },
  );

  it.each([
    ["malformed entries", "not JSON"],
    ["no courses", "[]"],
    [
      "more than eight courses",
      JSON.stringify(
        Array.from({ length: 9 }, () => ({ courseId, value: 91 })),
      ),
    ],
    [
      "a malformed course identifier",
      JSON.stringify([{ courseId: "invalid", value: 91 }]),
    ],
    ["a percentage below zero", JSON.stringify([{ courseId, value: -1 }])],
    ["a percentage above 100", JSON.stringify([{ courseId, value: 101 }])],
    ["an empty standing", JSON.stringify([{ courseId, value: "  " }])],
    [
      "a standing longer than 500 characters",
      JSON.stringify([{ courseId, value: "a".repeat(501) }]),
    ],
  ])(
    "preserves server grade validation for %s without recording",
    async (_label, entries) => {
      const formData = new FormData();
      formData.set("weekId", weekId);
      formData.set("entries", entries);
      await expect(submitWeeklyCheckIn({}, formData)).resolves.toEqual({
        message:
          "Nothing was recorded. Check every active course and try again.",
      });
      expect(boundaries.rpc).not.toHaveBeenCalled();
    },
  );

  it("retains drafts and shows only a safe message when the database rejects a submission", async () => {
    boundaries.rpc.mockResolvedValueOnce({
      error: { message: "Synthetic private provider details" },
    });
    const { container } = render(
      createElement(WeeklyCheckInForm, {
        weekId,
        courses: [
          {
            id: courseId,
            name: "Synthetic Calculus",
            gradingType: "percentage",
            previousValue: 85,
          },
        ],
      }),
    );
    const grade = screen.getByRole("spinbutton");
    const comment = screen.getByLabelText(
      /Anything you want to explain about these grades/i,
    );
    fireEvent.change(grade, { target: { value: "91" } });
    fireEvent.change(comment, { target: { value: "Synthetic exam context" } });
    fireEvent.submit(container.querySelector("form")!);

    const message = await screen.findByRole("alert");
    expect(message.textContent).toBe(
      "We couldn’t submit your grades. Nothing was recorded. Try again. If this continues, contact the Scholarship Chair.",
    );
    expect(screen.queryByText(/Synthetic private provider details/)).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(message));
    expect((grade as HTMLInputElement).value).toBe("91");
    expect((comment as HTMLTextAreaElement).value).toBe(
      "Synthetic exam context",
    );
  });
});
