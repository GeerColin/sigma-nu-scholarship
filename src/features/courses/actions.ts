"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  courseScaleArguments,
  courseSchema,
  updateCourseSchema,
} from "@/features/courses/validation";
import { requireApprovedMemberContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const coursesPath = "/member/courses";

function courseValues(formData: FormData) {
  return {
    name: formData.get("name"),
    creditHours: formData.get("creditHours"),
    gradingType: formData.get("gradingType"),
    customDescription: formData.get("customDescription") || undefined,
    useCustomScale: formData.get("useCustomScale") === "on",
    percentageAMin: formData.get("percentageAMin") || undefined,
    percentageBMin: formData.get("percentageBMin") || undefined,
    percentageCMin: formData.get("percentageCMin") || undefined,
    percentageDMin: formData.get("percentageDMin") || undefined,
  };
}

export async function createCourse(formData: FormData) {
  await requireApprovedMemberContext();
  const parsed = courseSchema.safeParse(courseValues(formData));
  if (!parsed.success)
    redirect((coursesPath + "?error=invalid-course") as never);

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_member_course_configured", {
    course_name: parsed.data.name,
    course_credit_hours: parsed.data.creditHours,
    course_grading_type: parsed.data.gradingType,
    course_custom_description: parsed.data.customDescription ?? null,
    ...courseScaleArguments(parsed.data),
  });
  if (error) redirect((coursesPath + "?error=not-saved") as never);
  revalidatePath(coursesPath);
  redirect((coursesPath + "?status=created") as never);
}

export async function updateCourse(formData: FormData) {
  await requireApprovedMemberContext();
  const parsed = updateCourseSchema.safeParse({
    courseId: formData.get("courseId"),
    ...courseValues(formData),
  });
  if (!parsed.success)
    redirect((coursesPath + "?error=invalid-course") as never);

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_member_course", {
    target_course_id: parsed.data.courseId,
    course_name: parsed.data.name,
    course_credit_hours: parsed.data.creditHours,
    course_grading_type: parsed.data.gradingType,
    course_custom_description: parsed.data.customDescription ?? null,
    ...courseScaleArguments(parsed.data),
  });
  if (error) redirect((coursesPath + "?error=not-saved") as never);
  revalidatePath(coursesPath);
  redirect((coursesPath + "?status=updated") as never);
}

export async function archiveCourse(formData: FormData) {
  await requireApprovedMemberContext();
  const parsed = z.string().uuid().safeParse(formData.get("courseId"));
  if (!parsed.success) redirect((coursesPath + "?error=not-archived") as never);

  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_member_course", {
    course_id: parsed.data,
  });
  if (error) redirect((coursesPath + "?error=not-archived") as never);
  revalidatePath(coursesPath);
  redirect((coursesPath + "?status=archived") as never);
}
