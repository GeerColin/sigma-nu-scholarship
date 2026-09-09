"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  acknowledgeAlertSchema,
  customGradingReviewSchema,
} from "@/features/academics/validation";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export async function reviewCustomGrading(formData: FormData) {
  await requireChairContext();
  const parsed = customGradingReviewSchema.safeParse({
    courseId: formData.get("courseId"),
    treatment: formData.get("treatment"),
    reason: formData.get("reason"),
  });
  const memberId = String(formData.get("memberId") ?? "");
  if (!parsed.success)
    redirect(`/members/${memberId}?error=invalid-review` as never);

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_custom_grading", {
    target_course_id: parsed.data.courseId,
    selected_treatment: parsed.data.treatment,
    review_reason: parsed.data.reason,
  });
  if (error) redirect(`/members/${memberId}?error=review-not-saved` as never);
  revalidatePath("/");
  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  redirect(`/members/${memberId}?status=custom-reviewed` as never);
}

export async function acknowledgeAcademicAlert(formData: FormData) {
  await requireChairContext();
  const parsed = acknowledgeAlertSchema.safeParse({
    alertId: formData.get("alertId"),
    reason: formData.get("reason"),
  });
  const memberId = String(formData.get("memberId") ?? "");
  if (!parsed.success)
    redirect(`/members/${memberId}?error=invalid-alert` as never);

  const supabase = await createClient();
  const { error } = await supabase.rpc("acknowledge_academic_alert", {
    target_alert_id: parsed.data.alertId,
    acknowledgement_reason: parsed.data.reason,
  });
  if (error) redirect(`/members/${memberId}?error=alert-not-saved` as never);
  revalidatePath("/");
  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  redirect(`/members/${memberId}?status=alert-acknowledged` as never);
}
