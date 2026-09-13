// @vitest-environment jsdom

import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ErrorPage from "@/app/error";
import { CourseManager } from "@/features/courses/course-manager";
import { WeeklyCheckInForm } from "@/features/grades/weekly-check-in-form";
import {
  ProctorSessionLogger,
  type SessionItem,
} from "@/features/study-hours/proctor-session-logger";

vi.mock("@/features/courses/actions", () => ({
  createCourse: vi.fn(),
  updateCourse: vi.fn(),
  archiveCourse: vi.fn(),
}));
vi.mock("@/features/grades/actions", () => ({
  submitWeeklyCheckIn: vi.fn(),
}));
vi.mock("@/features/study-hours/actions", () => ({
  recordStudySession: vi.fn(),
  correctStudySession: vi.fn(),
  editOwnStudySession: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("synthetic usability interactions", () => {
  it("uses the current Next.js retry callback without exposing error details", () => {
    const retry = vi.fn();
    render(createElement(ErrorPage, { retry }));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "We couldn’t load this page",
    );
  });

  it("prefills weekly grades, labels their source, and distinguishes revisions", () => {
    const { container } = render(
      createElement(WeeklyCheckInForm, {
        weekId: "synthetic-week",
        isRevision: true,
        courses: [
          {
            id: "synthetic-course",
            name: "Synthetic Calculus",
            gradingType: "percentage",
            previousValue: 85,
          },
        ],
      }),
    );
    expect(screen.getByText(/Current submission:/).textContent).toContain("85");
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input.value).toBe("85");
    expect(input.inputMode).toBe("decimal");
    fireEvent.change(input, { target: { value: "90" } });
    const entries = container.querySelector<HTMLInputElement>(
      'input[name="entries"]',
    );
    expect(JSON.parse(entries!.value)).toEqual([
      { courseId: "synthetic-course", value: 90 },
    ]);
    expect(
      screen.getByRole("button", { name: "Save revised grades" }),
    ).toBeTruthy();
  });

  it("shows only relevant course grading fields and reveals custom scale inputs", () => {
    render(createElement(CourseManager, { initialCourses: [] }));
    expect(screen.queryByLabelText("Describe the grading system")).toBeNull();
    expect(screen.queryByLabelText("A minimum")).toBeNull();
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /Use a course-specific percentage scale/,
      }),
    );
    expect(screen.getByLabelText("A minimum")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Grading type"), {
      target: { value: "custom" },
    });
    expect(screen.queryByLabelText("A minimum")).toBeNull();
    expect(
      (
        screen.getByLabelText(
          "Describe the grading system",
        ) as HTMLTextAreaElement
      ).required,
    ).toBe(true);
  });

  it("requires an archive acknowledgment and explains history preservation", () => {
    render(
      createElement(CourseManager, {
        initialCourses: [
          {
            id: "synthetic-course",
            name: "Synthetic Calculus",
            creditHours: 3,
            gradingType: "letter",
          },
        ],
      }),
    );
    const acknowledgment = screen.getByRole("checkbox", {
      name: "I understand this course will be archived.",
      hidden: true,
    }) as HTMLInputElement;
    expect(acknowledgment.required).toBe(true);
    expect(screen.getByText(/Existing history stays available/)).toBeTruthy();
  });

  it("lets a Proctor enter hours and minutes while keeping academic data absent", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T12:00:00Z"));
    const { container } = render(
      createElement(ProctorSessionLogger, {
        members: [
          { memberId: "synthetic-member", fullName: "Synthetic Member" },
        ],
        weekId: "synthetic-week",
        weekLabel: "Synthetic Week 3",
        currentWeekStartsOn: "2026-09-07",
        currentWeekEndsOn: "2026-09-11",
        defaultSessionDate: "2026-09-12",
        initialSessions: [],
        canCorrectAll: false,
      }),
    );
    const submit = screen.getByRole("button", {
      name: "Record study hours",
    }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Search active members"), {
      target: { value: "Synthetic Member" },
    });
    fireEvent.change(screen.getByLabelText("Minutes"), {
      target: { value: "30" },
    });
    expect(submit.disabled).toBe(false);
    expect(
      container.querySelector<HTMLInputElement>('input[name="hours"]')!.value,
    ).toBe("1.5");
    expect((screen.getByLabelText("Date") as HTMLInputElement).value).toBe(
      "2026-09-11",
    );
    expect(screen.queryByText(/GPA|grade|academic standing/i)).toBeNull();
  });

  it("offers Proctors only their own current-week edit controls", () => {
    const base: SessionItem = {
      id: "own-current",
      memberName: "Synthetic Member",
      proctorName: "Synthetic Proctor",
      date: "2026-09-09",
      durationMinutes: 60,
      weekId: "synthetic-week",
      weekLabel: "Synthetic Week 3",
      weekStartsOn: "2026-09-07",
      weekEndsOn: "2026-09-13",
      isCurrentWeek: true,
      ownedByViewer: true,
    };
    render(
      createElement(ProctorSessionLogger, {
        members: [],
        weekId: null,
        weekLabel: "No current week",
        currentWeekStartsOn: null,
        currentWeekEndsOn: null,
        defaultSessionDate: "2026-09-12",
        canCorrectAll: false,
        initialSessions: [
          base,
          { ...base, id: "old", isCurrentWeek: false },
          { ...base, id: "other-proctor", ownedByViewer: false },
        ],
      }),
    );
    expect(screen.getAllByText("Edit entry")).toHaveLength(1);
    expect(screen.getAllByText("Locked")).toHaveLength(2);
    expect(screen.queryByLabelText("Correction reason")).toBeNull();
  });
});
