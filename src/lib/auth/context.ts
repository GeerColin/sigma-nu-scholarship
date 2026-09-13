import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  classifyFailure,
  getReadDiagnosticState,
  recordFailure,
  ReadFailure,
} from "@/lib/supabase/diagnostics";
import { createReadFailure } from "@/lib/supabase/read-failure";

export type CurrentUserContext = {
  userId: string;
  email: string;
  memberId: string | null;
  chapterId: string | null;
  memberName: string | null;
  status: "active" | "inactive" | "alumni" | null;
  roles: Array<"member" | "proctor" | "admin" | "scholarship_chair">;
  accessRequestStatus: "pending" | "approved" | "rejected" | null;
};

export const getCurrentUserContext = cache(
  async (): Promise<CurrentUserContext | null> => {
    const supabase = await createClient();
    const diagnostic = getReadDiagnosticState();
    const authResult = await supabase.auth.getUser().catch((error: unknown) => {
      const category = classifyFailure(error);
      recordFailure("auth", category, error, undefined, undefined, diagnostic);
      throw new ReadFailure(
        "Could not verify your sign-in. Please try again.",
        category,
      );
    });
    const { data: authData, error: authError } = authResult;
    if (authError) {
      const category = classifyFailure(authError, authError.status);
      diagnostic.session =
        category === "session_missing"
          ? "missing"
          : category === "session_invalid"
            ? "invalid"
            : "unknown";
      recordFailure(
        "auth",
        category,
        authError,
        authError.status,
        undefined,
        diagnostic,
      );
      if (category === "session_missing" || category === "session_invalid")
        return null;
      throw new ReadFailure(
        "Could not verify your sign-in. Please try again.",
        category,
      );
    }
    if (!authData.user) {
      diagnostic.session = "missing";
      recordFailure(
        "auth",
        "session_missing",
        undefined,
        undefined,
        undefined,
        diagnostic,
      );
      return null;
    }
    diagnostic.session = "verified";

    const [memberResult, accessRequestResult] = await Promise.all([
      supabase
        .from("members")
        .select("id, chapter_id, full_name, status, member_roles(role, active)")
        .eq("profile_id", authData.user.id)
        .maybeSingle(),
      supabase
        .from("access_requests")
        .select("status")
        .eq("profile_id", authData.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (memberResult.error || accessRequestResult.error) {
      throw createReadFailure(
        "Could not load your account access. Please try again.",
        [
          { operation: "member_linkage", ...memberResult },
          { operation: "access_request", ...accessRequestResult },
        ],
      );
    }
    const member = memberResult.data;
    const accessRequest = accessRequestResult.data;
    if (!member)
      recordFailure(
        "member_linkage",
        "missing_linkage",
        undefined,
        memberResult.status,
        undefined,
        diagnostic,
      );

    const roleRows = (member?.member_roles ?? []) as Array<{
      role: CurrentUserContext["roles"][number];
      active: boolean;
    }>;
    return {
      userId: authData.user.id,
      email: authData.user.email ?? "",
      memberId: member?.id ?? null,
      chapterId: member?.chapter_id ?? null,
      memberName: member?.full_name ?? null,
      status: member?.status ?? null,
      roles: roleRows.filter((role) => role.active).map((role) => role.role),
      accessRequestStatus: accessRequest?.status ?? null,
    };
  },
);
