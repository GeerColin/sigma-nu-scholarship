import type { CurrentUserContext } from "@/lib/auth/context";

export type ProtectedSurface = "member" | "proctor" | "chair";

export function getProtectedSurfaceRedirect(
  context: CurrentUserContext | null,
  surface: ProtectedSurface,
): string | null {
  if (!context) return "/login";

  const hasApprovedMembership = Boolean(
    context.memberId && context.chapterId && context.roles.includes("member"),
  );

  if (!hasApprovedMembership) {
    return context.accessRequestStatus
      ? "/awaiting-approval"
      : "/request-access";
  }

  if (surface === "member") return null;
  if (context.status !== "active") return "/member";

  if (surface === "proctor") {
    return context.roles.some((role) =>
      ["proctor", "admin", "scholarship_chair"].includes(role),
    )
      ? null
      : "/member";
  }

  return context.roles.some((role) =>
    ["admin", "scholarship_chair"].includes(role),
  )
    ? null
    : "/member";
}
