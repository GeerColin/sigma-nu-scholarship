"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  activateSemesterSchema,
  chapterConfigurationSchema,
  deadlineOverrideSchema,
  saveEmailTemplateSchema,
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

export async function updateChapterConfiguration(formData: FormData) {
  await requireChairContext();
  const parsed = chapterConfigurationSchema.safeParse({
    percentageAlertDrop: formData.get("percentageAlertDrop"),
    letterAlertSteps: formData.get("letterAlertSteps"),
    emailFrom: formData.get("emailFrom"),
    emailReplyTo: formData.get("emailReplyTo"),
  });
  if (!parsed.success) redirect(`${settingsPath}?error=invalid-configuration`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_chapter_configuration", {
    percentage_drop: parsed.data.percentageAlertDrop,
    letter_steps: parsed.data.letterAlertSteps,
    sender_identity: parsed.data.emailFrom,
    reply_address: parsed.data.emailReplyTo,
  });
  if (error) redirect(`${settingsPath}?error=configuration-not-updated`);
  revalidatePath(settingsPath);
  revalidatePath("/setup");
  redirect(`${settingsPath}?status=configuration-updated`);
}

export async function saveEmailTemplate(formData: FormData) {
  await requireChairContext();
  const parsed = saveEmailTemplateSchema.safeParse({
    templateType: formData.get("templateType"),
    name: formData.get("name"),
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) redirect(`${settingsPath}?error=invalid-email-template`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_email_template", {
    requested_template_type: parsed.data.templateType,
    template_name: parsed.data.name,
    subject_template: parsed.data.subject,
    body_template: parsed.data.body,
  });
  if (error) redirect(`${settingsPath}?error=email-template-not-saved`);
  revalidatePath(settingsPath);
  revalidatePath("/email");
  redirect(`${settingsPath}?status=email-template-saved`);
}
