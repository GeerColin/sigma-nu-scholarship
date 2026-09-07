import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

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
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return null;

    const [{ data: member }, { data: accessRequest }] = await Promise.all([
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
