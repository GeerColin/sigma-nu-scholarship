"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const studySessionSchema = z.object({
  memberId: z.string().uuid(),
  weekId: z.string().uuid(),
  date: z.iso.date(),
  hours: z.coerce.number().positive().max(24),
  notes: z.string().trim().max(500).optional(),
});

export async function recordStudySession(formData: FormData) {
  const parsed = studySessionSchema.safeParse({
    memberId: formData.get("memberId"),
    weekId: formData.get("weekId"),
    date: formData.get("date"),
    hours: formData.get("hours"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) redirect("/proctor?error=invalid-session" as never);
  const minutes = parsed.data.hours * 60;
  if (!Number.isInteger(minutes))
    redirect("/proctor?error=invalid-session" as never);
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_study_session", {
    target_member_id: parsed.data.memberId,
    target_week_id: parsed.data.weekId,
    session_date: parsed.data.date,
    duration_minutes: minutes,
    notes: parsed.data.notes ?? null,
  });
  if (error) redirect("/proctor?error=not-recorded" as never);
  redirect("/proctor?status=recorded" as never);
}
