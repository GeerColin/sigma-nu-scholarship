"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  activateSemesterSchema,
  deadlineOverrideSchema,
  semesterSchema,
} from "@/features/settings/validation";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const settingsPath = "/settings";

export async function createSemester(formData: FormData) {
  await requireChairContext();
  const parsed = semesterSchema.safeParse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    timezone: formData.get("timezone"),
    deadlineWeekday: formData.get("deadlineWeekday"),
    deadlineTime: formData.get("deadlineTime"),
    makeActive: formData.get("makeActive") === "on",
  });
  if (!parsed.success) redirect(`${settingsPath}?error=invalid-semester`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_semester_with_weeks", {
    semester_name: parsed.data.name,
    semester_start_date: parsed.data.startDate,
    semester_end_date: parsed.data.endDate,
    semester_timezone: parsed.data.timezone,
    deadline_weekday: parsed.data.deadlineWeekday,
    deadline_time: parsed.data.deadlineTime,
    make_active: parsed.data.makeActive,
  });
  if (error) redirect(`${settingsPath}?error=semester-not-created`);

  revalidatePath("/");
  revalidatePath(settingsPath);
  redirect(`${settingsPath}?status=semester-created`);
}

export async function activateSemester(formData: FormData) {
  await requireChairContext();
  const parsed = activateSemesterSchema.safeParse({
    semesterId: formData.get("semesterId"),
  });
  if (!parsed.success) redirect(`${settingsPath}?error=invalid-semester`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("activate_semester", {
    target_semester_id: parsed.data.semesterId,
  });
  if (error) redirect(`${settingsPath}?error=semester-not-activated`);

  revalidatePath("/");
  revalidatePath(settingsPath);
  redirect(`${settingsPath}?status=semester-activated`);
}

export async function overrideAcademicWeekDeadline(formData: FormData) {
  await requireChairContext();
  const parsed = deadlineOverrideSchema.safeParse({
    weekId: formData.get("weekId"),
    deadlineDate: formData.get("deadlineDate"),
    deadlineTime: formData.get("deadlineTime"),
  });
  if (!parsed.success) redirect(`${settingsPath}?error=invalid-deadline`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("override_academic_week_deadline", {
    target_week_id: parsed.data.weekId,
    deadline_date: parsed.data.deadlineDate,
    deadline_time: parsed.data.deadlineTime,
  });
  if (error) redirect(`${settingsPath}?error=deadline-not-updated`);

  revalidatePath("/");
  revalidatePath(settingsPath);
  redirect(`${settingsPath}?status=deadline-updated`);
}
