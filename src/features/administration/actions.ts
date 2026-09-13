"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  approveAccessRequestSchema,
  disconnectAccountSchema,
  manageMemberRoleSchema,
  rejectAccessRequestSchema,
  transferChairSchema,
} from "@/features/administration/access-validation";
import { rosterImportSchema } from "@/features/administration/roster-import-validation";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const accessPath = "/administration/access";
const rolesPath = "/administration/roles";

export type RosterImportActionState = {
  status: "idle" | "success" | "error";
  message: string;
  insertedCount?: number;
  duplicateCount?: number;
};

export async function importRosterMembers(
  _previousState: RosterImportActionState,
  formData: FormData,
): Promise<RosterImportActionState> {
  await requireChairContext();

  let rows: unknown;
  try {
    rows = JSON.parse(String(formData.get("rows") ?? "null"));
  } catch {
    return { status: "error", message: "The roster preview is not valid." };
  }

  const parsed = rosterImportSchema.safeParse({
    confirmed: formData.get("confirmed"),
    rows,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        "Review the file and explicitly confirm at least one valid member.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_roster_members", {
    import_rows: parsed.data.rows,
  });
  if (error) {
    return {
      status: "error",
      message: "The roster was not imported. No partial import was kept.",
    };
  }

  const result = (Array.isArray(data) ? data[0] : data) as {
    inserted_count?: number;
    duplicate_count?: number;
  } | null;
  const insertedCount = result?.inserted_count ?? 0;
  const duplicateCount = result?.duplicate_count ?? 0;
  revalidatePath("/administration");
  revalidatePath("/administration/import");
  return {
    status: "success",
    message: `${insertedCount} member${insertedCount === 1 ? "" : "s"} imported${duplicateCount ? `; ${duplicateCount} duplicate${duplicateCount === 1 ? " was" : "s were"} skipped` : ""}.`,
    insertedCount,
    duplicateCount,
  };
}

export async function approveAccessRequest(formData: FormData) {
  await requireChairContext();
  const parsed = approveAccessRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    memberId: formData.get("memberId"),
  });
  if (!parsed.success) redirect(`${accessPath}?error=invalid-approval`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_access_request", {
    request_id: parsed.data.requestId,
    roster_member_id: parsed.data.memberId,
  });
  if (error) redirect(`${accessPath}?error=approval-failed`);

  revalidatePath(accessPath);
  redirect(`${accessPath}?status=approved`);
}

export async function rejectAccessRequest(formData: FormData) {
  await requireChairContext();
  const parsed = rejectAccessRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect(`${accessPath}?error=invalid-rejection`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_access_request", {
    request_id: parsed.data.requestId,
    reason: parsed.data.reason,
  });
  if (error) redirect(`${accessPath}?error=rejection-failed`);

  revalidatePath(accessPath);
  redirect(`${accessPath}?status=rejected`);
}

export async function disconnectMemberAccount(formData: FormData) {
  await requireChairContext();
  const parsed = disconnectAccountSchema.safeParse({
    memberId: formData.get("memberId"),
    reason: formData.get("reason"),
    confirmed: formData.get("confirmed"),
  });
  if (!parsed.success) redirect(`${accessPath}?error=invalid-disconnection`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("disconnect_member_account", {
    roster_member_id: parsed.data.memberId,
    reason: parsed.data.reason,
  });
  if (error) redirect(`${accessPath}?error=disconnection-failed`);

  revalidatePath(accessPath);
  redirect(`${accessPath}?status=disconnected`);
}

export async function manageMemberRole(formData: FormData) {
  await requireChairContext();
  const parsed = manageMemberRoleSchema.safeParse({
    memberId: formData.get("memberId"),
    role: formData.get("role"),
    enabled: formData.get("enabled"),
  });
  if (!parsed.success) redirect(`${rolesPath}?error=invalid-role-change`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("manage_member_role", {
    roster_member_id: parsed.data.memberId,
    managed_role: parsed.data.role,
    enable_role: parsed.data.enabled,
  });
  if (error) redirect(`${rolesPath}?error=role-change-failed`);

  revalidatePath("/administration");
  revalidatePath(rolesPath);
  redirect(
    `${rolesPath}?status=${parsed.data.enabled ? "assigned" : "removed"}`,
  );
}

export async function transferScholarshipChair(formData: FormData) {
  await requireChairContext();
  const parsed = transferChairSchema.safeParse({
    successorMemberId: formData.get("successorMemberId"),
    outgoingRoles: formData.getAll("outgoingRoles"),
    confirmed: formData.get("confirmed"),
  });
  if (!parsed.success) {
    redirect("/administration/handoff?error=invalid-handoff");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_scholarship_chair", {
    successor_member_id: parsed.data.successorMemberId,
    outgoing_lower_roles: parsed.data.outgoingRoles,
  });
  if (error) redirect("/administration/handoff?error=handoff-failed");

  revalidatePath("/");
  revalidatePath("/administration");
  redirect("/member?status=chair-transferred");
}
