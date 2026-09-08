import { describe, expect, it } from "vitest";
import type { CurrentUserContext } from "@/lib/auth/context";
import { getProtectedSurfaceRedirect } from "@/lib/auth/permissions";

function context(
  overrides: Partial<CurrentUserContext> = {},
): CurrentUserContext {
  return {
    userId: "user-1",
    email: "member@example.test",
    memberId: "member-1",
    chapterId: "chapter-1",
    memberName: "Synthetic Member",
    status: "active",
    roles: ["member"],
    accessRequestStatus: "approved",
    ...overrides,
  };
}

describe("route authorization", () => {
  it.each(["member", "proctor", "chair"] as const)(
    "redirects unauthenticated %s access to login",
    (surface) => {
      expect(getProtectedSurfaceRedirect(null, surface)).toBe("/login");
    },
  );

  it("keeps an unlinked account in the access-request flow", () => {
    expect(
      getProtectedSurfaceRedirect(
        context({
          memberId: null,
          chapterId: null,
          roles: [],
          accessRequestStatus: "pending",
        }),
        "chair",
      ),
    ).toBe("/awaiting-approval");
  });

  it("sends an unlinked account without a request to request access", () => {
    expect(
      getProtectedSurfaceRedirect(
        context({
          memberId: null,
          chapterId: null,
          roles: [],
          accessRequestStatus: null,
        }),
        "member",
      ),
    ).toBe("/request-access");
  });

  it("allows an approved member to use member routes", () => {
    expect(getProtectedSurfaceRedirect(context(), "member")).toBeNull();
  });

  it("denies a normal member access to proctor and Chair routes", () => {
    expect(getProtectedSurfaceRedirect(context(), "proctor")).toBe("/member");
    expect(getProtectedSurfaceRedirect(context(), "chair")).toBe("/member");
  });

  it("allows a Proctor to use the Proctor portal but not Chair routes", () => {
    const proctor = context({ roles: ["member", "proctor"] });
    expect(getProtectedSurfaceRedirect(proctor, "proctor")).toBeNull();
    expect(getProtectedSurfaceRedirect(proctor, "chair")).toBe("/member");
  });

  it.each(["admin", "scholarship_chair"] as const)(
    "allows an active %s to use Chair and Proctor routes",
    (role) => {
      const operator = context({ roles: ["member", role] });
      expect(getProtectedSurfaceRedirect(operator, "chair")).toBeNull();
      expect(getProtectedSurfaceRedirect(operator, "proctor")).toBeNull();
    },
  );

  it("denies operational role routes when the linked member is inactive", () => {
    const inactiveChair = context({
      status: "inactive",
      roles: ["member", "scholarship_chair"],
    });
    expect(getProtectedSurfaceRedirect(inactiveChair, "chair")).toBe("/member");
  });
});
