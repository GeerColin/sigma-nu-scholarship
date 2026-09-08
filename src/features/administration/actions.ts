"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  approveAccessRequestSchema,
  disconnectAccountSchema,
  rejectAccessRequestSchema,
} from "@/features/administration/access-validation";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const accessPath = "/administration/access";

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
