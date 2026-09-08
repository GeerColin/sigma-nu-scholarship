import "server-only";

import { redirect } from "next/navigation";
import {
  getCurrentUserContext,
  type CurrentUserContext,
} from "@/lib/auth/context";
import {
  getProtectedSurfaceRedirect,
  type ProtectedSurface,
} from "@/lib/auth/permissions";

async function requireSurface(
  surface: ProtectedSurface,
): Promise<CurrentUserContext> {
  const context = await getCurrentUserContext();
  const destination = getProtectedSurfaceRedirect(context, surface);
  if (destination) redirect(destination as never);
  return context!;
}

export function requireApprovedMemberContext() {
  return requireSurface("member");
}

export function requireProctorContext() {
  return requireSurface("proctor");
}

export function requireChairContext() {
  return requireSurface("chair");
}
