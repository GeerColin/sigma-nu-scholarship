"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireApprovedMemberContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const entriesSchema = z
  .array(
    z.object({
      courseId: z.string().uuid(),
      value: z.union([
        z.number().min(0).max(100),
        z.string().trim().min(1).max(500),
      ]),
    }),
  )
  .min(1)
  .max(30);

const submissionCommentSchema = z
  .string()
  .trim()
  .max(1000)
  .refine(
    (value) => value.length === 0 || value.split(/\s+/).length <= 30,
    "Submission comments must be 30 words or fewer",
  )
  .optional();

export async function submitWeeklyCheckIn(formData: FormData) {
  await requireApprovedMemberContext();
  const weekId = z.string().uuid().safeParse(formData.get("weekId"));
  let rawEntries: unknown;
  try {
    rawEntries = JSON.parse(String(formData.get("entries")));
  } catch {
    redirect("/member/check-in?error=invalid-grades");
  }
  const entries = entriesSchema.safeParse(rawEntries);
  const submissionComment = submissionCommentSchema.safeParse(
    formData.get("submissionComment") ?? undefined,
  );
  if (!weekId.success || !entries.success || !submissionComment.success)
    redirect("/member/check-in?error=invalid-grades");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_weekly_checkin", {
    target_week_id: weekId.data,
    submitted_entries: entries.data,
    submission_comment: submissionComment.data || null,
  });
  if (error) redirect("/member/check-in?error=not-recorded");
  redirect("/member/check-in?status=submitted");
}
