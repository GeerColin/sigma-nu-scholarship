"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireApprovedMemberContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { submissionCommentSchema } from "@/lib/domain/submission-comments";

export type WeeklyCheckInActionState = {
  commentError?: string;
  message?: string;
};

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
  .max(8);

export async function submitWeeklyCheckIn(
  _previousState: WeeklyCheckInActionState,
  formData: FormData,
): Promise<WeeklyCheckInActionState> {
  await requireApprovedMemberContext();
  const weekId = z.string().uuid().safeParse(formData.get("weekId"));
  let rawEntries: unknown;
  try {
    rawEntries = JSON.parse(String(formData.get("entries")));
  } catch {
    return {
      message: "Nothing was recorded. Check every active course and try again.",
    };
  }
  const entries = entriesSchema.safeParse(rawEntries);
  const submissionComment = submissionCommentSchema.safeParse(
    formData.get("submissionComment") ?? undefined,
  );
  if (!submissionComment.success)
    return {
      commentError:
        submissionComment.error.issues[0]?.code === "invalid_type"
          ? "Enter a text comment or leave it blank."
          : (submissionComment.error.issues[0]?.message ??
            "Check your comment and try again."),
    };
  if (!weekId.success || !entries.success)
    return {
      message: "Nothing was recorded. Check every active course and try again.",
    };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_weekly_checkin", {
    target_week_id: weekId.data,
    submitted_entries: entries.data,
    submission_comment: submissionComment.data || null,
  });
  if (error)
    return {
      message:
        "We couldn’t submit your grades. Nothing was recorded. Try again. If this continues, contact the Scholarship Chair.",
    };
  redirect("/member/check-in?status=submitted");
}
