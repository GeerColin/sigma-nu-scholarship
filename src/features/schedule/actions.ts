"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireChairContext, requireProctorContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  formProctorIds,
  manageScheduleOccurrenceSchema,
  proctorScheduleEditSchema,
  removeScheduleSeriesSchema,
  scheduleNotificationSchema,
  scheduleSeriesSchema,
  updateScheduleSeriesSchema,
} from "@/features/schedule/validation";

const schedulePath = "/schedule";
const administrationSchedulePath = "/administration/schedule";

function optionalText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function weekValue(formData: FormData) {
  const value = formData.get("week");
  return typeof value === "string" && /^\d+$/.test(value) ? value : null;
}

function redirectSchedule(
  status?: string,
  error?: string,
  week?: string | null,
): never {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (error) query.set("error", error);
  if (week) query.set("week", week);
  redirect(
    `${schedulePath}${query.size ? `?${query.toString()}` : ""}` as never,
  );
}

function revalidateSchedule() {
  revalidatePath(schedulePath);
  revalidatePath("/");
  revalidatePath("/member");
  revalidatePath("/proctor");
  revalidatePath(administrationSchedulePath);
  revalidatePath("/administration");
}

export async function createScheduleSeries(formData: FormData) {
  await requireChairContext();
  const proctorIds = formProctorIds(formData);
  const parsed = scheduleSeriesSchema.safeParse({
    semesterId: formData.get("semesterId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    location: formData.get("location"),
    instructions: optionalText(formData.get("instructions")),
    proctorMemberIds: proctorIds.success ? proctorIds.data : [],
  });
  if (!parsed.success)
    redirect(`${administrationSchedulePath}?error=invalid-series` as never);
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_study_schedule_series", {
    target_semester_id: parsed.data.semesterId,
    schedule_day_of_week: parsed.data.dayOfWeek,
    schedule_start_time: parsed.data.startTime,
    schedule_end_time: parsed.data.endTime,
    schedule_location: parsed.data.location,
    schedule_instructions: parsed.data.instructions ?? null,
    proctor_member_ids: parsed.data.proctorMemberIds,
  });
  if (error)
    redirect(`${administrationSchedulePath}?error=series-not-saved` as never);
  revalidateSchedule();
  redirect(`${administrationSchedulePath}?status=series-created` as never);
}

export async function updateScheduleSeries(formData: FormData) {
  await requireChairContext();
  const proctorIds = formProctorIds(formData);
  const parsed = updateScheduleSeriesSchema.safeParse({
    seriesId: formData.get("seriesId"),
    semesterId: formData.get("semesterId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    location: formData.get("location"),
    instructions: optionalText(formData.get("instructions")),
    proctorMemberIds: proctorIds.success ? proctorIds.data : [],
  });
  if (!parsed.success)
    redirect(`${administrationSchedulePath}?error=invalid-series` as never);
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_study_schedule_series", {
    target_series_id: parsed.data.seriesId,
    schedule_day_of_week: parsed.data.dayOfWeek,
    schedule_start_time: parsed.data.startTime,
    schedule_end_time: parsed.data.endTime,
    schedule_location: parsed.data.location,
    schedule_instructions: parsed.data.instructions ?? null,
    proctor_member_ids: parsed.data.proctorMemberIds,
  });
  if (error)
    redirect(`${administrationSchedulePath}?error=series-not-saved` as never);
  revalidateSchedule();
  redirect(`${administrationSchedulePath}?status=series-updated` as never);
}

export async function removeScheduleSeries(formData: FormData) {
  await requireChairContext();
  const parsed = removeScheduleSeriesSchema.safeParse({
    seriesId: formData.get("seriesId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success)
    redirect(`${administrationSchedulePath}?error=invalid-removal` as never);
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_study_schedule_series", {
    target_series_id: parsed.data.seriesId,
    removal_reason: parsed.data.reason,
  });
  if (error)
    redirect(`${administrationSchedulePath}?error=series-not-removed` as never);
  revalidateSchedule();
  redirect(`${administrationSchedulePath}?status=series-removed` as never);
}

export async function manageScheduleOccurrence(formData: FormData) {
  await requireChairContext();
  const parsed = manageScheduleOccurrenceSchema.safeParse({
    occurrenceId: formData.get("occurrenceId"),
    operation: formData.get("operation"),
    startTime: optionalText(formData.get("startTime")),
    endTime: optionalText(formData.get("endTime")),
    location: optionalText(formData.get("location")),
    instructions: optionalText(formData.get("instructions")),
    reason: optionalText(formData.get("reason")),
    week: optionalText(formData.get("week")),
  });
  if (!parsed.success)
    redirectSchedule(undefined, "invalid-occurrence", weekValue(formData));
  const supabase = await createClient();
  const { error } = await supabase.rpc("manage_study_schedule_occurrence", {
    target_occurrence_id: parsed.data.occurrenceId,
    requested_operation: parsed.data.operation,
    exception_start_time: parsed.data.startTime ?? null,
    exception_end_time: parsed.data.endTime ?? null,
    exception_location: parsed.data.location ?? null,
    exception_instructions: parsed.data.instructions ?? null,
    change_reason: parsed.data.reason ?? null,
  });
  if (error)
    redirectSchedule(undefined, "occurrence-not-saved", parsed.data.week);
  revalidateSchedule();
  redirectSchedule("occurrence-saved", undefined, parsed.data.week);
}

export async function editScheduleOccurrenceByProctor(formData: FormData) {
  await requireProctorContext();
  const parsed = proctorScheduleEditSchema.safeParse({
    occurrenceId: formData.get("occurrenceId"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    location: formData.get("location"),
    week: optionalText(formData.get("week")),
  });
  if (!parsed.success)
    redirectSchedule(undefined, "invalid-occurrence", weekValue(formData));
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "update_study_schedule_occurrence_by_proctor",
    {
      target_occurrence_id: parsed.data.occurrenceId,
      new_start_time: parsed.data.startTime,
      new_end_time: parsed.data.endTime,
      new_location: parsed.data.location,
    },
  );
  if (error)
    redirectSchedule(undefined, "occurrence-not-saved", parsed.data.week);
  revalidateSchedule();
  redirectSchedule("occurrence-saved", undefined, parsed.data.week);
}

export async function markStudyScheduleNotificationRead(formData: FormData) {
  await requireChairContext();
  const parsed = scheduleNotificationSchema.safeParse({
    notificationId: formData.get("notificationId"),
  });
  if (!parsed.success) redirect("/?error=notification-not-found" as never);
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "mark_study_schedule_notification_read",
    {
      target_notification_id: parsed.data.notificationId,
    },
  );
  if (error) redirect("/?error=notification-not-found" as never);
  revalidatePath("/");
  revalidatePath(schedulePath);
  redirect("/?status=notification-read" as never);
}
