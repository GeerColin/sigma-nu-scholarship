"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  assignmentIdSchema,
  correctStudySessionSchema,
  editStudySessionSchema,
  overrideAssignmentSchema,
  refreshAssignmentsSchema,
  removeOverrideSchema,
  resolveAssignmentSchema,
  studyHourRuleSetSchema,
} from "@/features/study-hours/validation";
import { requireChairContext, requireProctorContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const studySessionSchema = z.object({
  memberId: z.string().uuid(),
  weekId: z.string().uuid(),
  date: z.iso.date(),
  hours: z.coerce.number().positive().max(24),
  notes: z.string().trim().max(500).optional(),
});

export async function recordStudySession(formData: FormData) {
  await requireProctorContext();
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

function sessionMinutes(hours: number) {
  const minutes = hours * 60;
  return Number.isInteger(minutes) ? minutes : null;
}

export async function editOwnStudySession(formData: FormData) {
  await requireProctorContext();
  const parsed = editStudySessionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    date: formData.get("date"),
    hours: formData.get("hours"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) redirect("/proctor?error=invalid-edit");
  const minutes = sessionMinutes(parsed.data.hours);
  if (minutes === null) redirect("/proctor?error=invalid-edit");

  const supabase = await createClient();
  const { error } = await supabase.rpc("edit_own_current_week_session", {
    session_id: parsed.data.sessionId,
    new_session_date: parsed.data.date,
    new_duration_minutes: minutes,
    new_notes: parsed.data.notes ?? null,
  });
  if (error) redirect("/proctor?error=edit-not-saved");
  revalidatePath("/proctor");
  redirect("/proctor?status=updated");
}

export async function correctStudySession(formData: FormData) {
  await requireChairContext();
  const parsed = correctStudySessionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    date: formData.get("date"),
    hours: formData.get("hours"),
    notes: formData.get("notes") || undefined,
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect("/proctor?error=invalid-correction");
  const minutes = sessionMinutes(parsed.data.hours);
  if (minutes === null) redirect("/proctor?error=invalid-correction");

  const supabase = await createClient();
  const { error } = await supabase.rpc("correct_study_session", {
    target_session_id: parsed.data.sessionId,
    new_session_date: parsed.data.date,
    new_duration_minutes: minutes,
    new_notes: parsed.data.notes ?? null,
    reason: parsed.data.reason,
  });
  if (error) redirect("/proctor?error=correction-not-saved");
  revalidatePath("/proctor");
  redirect("/proctor?status=corrected");
}

const studyHoursPath = "/study-hours";

export async function configureStudyHourRuleSet(formData: FormData) {
  await requireChairContext();
  const parsed = studyHourRuleSetSchema.safeParse({
    gpa350To400Hours: formData.get("gpa350To400Hours"),
    gpa300To349Hours: formData.get("gpa300To349Hours"),
    gpa275To299Hours: formData.get("gpa275To299Hours"),
    gpa250To274Hours: formData.get("gpa250To274Hours"),
    gpa225To249Hours: formData.get("gpa225To249Hours"),
    gpa200To224Hours: formData.get("gpa200To224Hours"),
    gpaBelow200Hours: formData.get("gpaBelow200Hours"),
    dAdjustmentHours: formData.get("dAdjustmentHours"),
    fAdjustmentHours: formData.get("fAdjustmentHours"),
    maximumHours: formData.get("maximumHours"),
    reason: formData.get("reason"),
    confirmed: formData.get("confirmed") === "on",
  });
  if (!parsed.success)
    redirect((studyHoursPath + "?error=invalid-rules") as never);

  const supabase = await createClient();
  const { error } = await supabase.rpc("configure_study_hour_rule_set", {
    p_gpa_350_400_hours: parsed.data.gpa350To400Hours,
    p_gpa_300_349_hours: parsed.data.gpa300To349Hours,
    p_gpa_275_299_hours: parsed.data.gpa275To299Hours,
    p_gpa_250_274_hours: parsed.data.gpa250To274Hours,
    p_gpa_225_249_hours: parsed.data.gpa225To249Hours,
    p_gpa_200_224_hours: parsed.data.gpa200To224Hours,
    p_gpa_below_200_hours: parsed.data.gpaBelow200Hours,
    p_d_adjustment_hours: parsed.data.dAdjustmentHours,
    p_f_adjustment_hours: parsed.data.fAdjustmentHours,
    p_maximum_hours: parsed.data.maximumHours,
    p_reason: parsed.data.reason,
  });
  if (error) redirect((studyHoursPath + "?error=rules-not-saved") as never);
  revalidatePath(studyHoursPath);
  redirect((studyHoursPath + "?status=rules-configured") as never);
}

export async function refreshCurrentWeekStudyHours(formData: FormData) {
  await requireChairContext();
  const parsed = refreshAssignmentsSchema.safeParse({
    weekId: formData.get("weekId"),
  });
  if (!parsed.success)
    redirect((studyHoursPath + "?error=invalid-week") as never);

  const supabase = await createClient();
  const { error } = await supabase.rpc("refresh_study_hour_assignments", {
    target_week_id: parsed.data.weekId,
  });
  if (error)
    redirect((studyHoursPath + "?error=assignments-not-refreshed") as never);
  revalidatePath(studyHoursPath);
  revalidatePath("/");
  revalidatePath("/members");
  redirect((studyHoursPath + "?status=assignments-refreshed") as never);
}

export async function overrideStudyHourAssignment(formData: FormData) {
  await requireChairContext();
  const parsed = overrideAssignmentSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    hours: formData.get("hours"),
    reason: formData.get("reason"),
    confirmed: formData.get("confirmed") === "on",
  });
  if (!parsed.success)
    redirect((studyHoursPath + "?error=invalid-override") as never);
  const supabase = await createClient();
  const { error } = await supabase.rpc("override_study_hour_assignment", {
    assignment_id: parsed.data.assignmentId,
    new_hours: parsed.data.hours,
    reason: parsed.data.reason,
  });
  if (error) redirect((studyHoursPath + "?error=override-failed") as never);
  revalidatePath(studyHoursPath);
  redirect((studyHoursPath + "?status=overridden") as never);
}

export async function removeStudyHourOverride(formData: FormData) {
  await requireChairContext();
  const parsed = removeOverrideSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success)
    redirect((studyHoursPath + "?error=invalid-override-removal") as never);
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_study_hour_override", {
    assignment_id: parsed.data.assignmentId,
    reason: parsed.data.reason,
  });
  if (error)
    redirect((studyHoursPath + "?error=override-removal-failed") as never);
  revalidatePath(studyHoursPath);
  redirect((studyHoursPath + "?status=override-removed") as never);
}

export async function freezeStudyHourAssignment(formData: FormData) {
  await requireChairContext();
  const parsed = assignmentIdSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
  });
  if (!parsed.success)
    redirect((studyHoursPath + "?error=invalid-assignment") as never);
  const supabase = await createClient();
  const { error } = await supabase.rpc("freeze_study_hour_assignment", {
    assignment_id: parsed.data.assignmentId,
  });
  if (error) redirect((studyHoursPath + "?error=freeze-failed") as never);
  revalidatePath(studyHoursPath);
  redirect((studyHoursPath + "?status=frozen") as never);
}

export async function resolveStudyHourAssignment(formData: FormData) {
  await requireChairContext();
  const parsed = resolveAssignmentSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    decision: formData.get("decision"),
    reason: formData.get("reason"),
  });
  if (!parsed.success)
    redirect((studyHoursPath + "?error=invalid-resolution") as never);
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_frozen_assignment", {
    assignment_id: parsed.data.assignmentId,
    update_to_proposed: parsed.data.decision === "update",
    reason: parsed.data.reason,
  });
  if (error) redirect((studyHoursPath + "?error=resolution-failed") as never);
  revalidatePath(studyHoursPath);
  redirect((studyHoursPath + "?status=resolved") as never);
}
