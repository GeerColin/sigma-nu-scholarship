"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const courseSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    creditHours: z.coerce.number().positive().max(24),
    gradingType: z.enum(["percentage", "letter", "pass_fail", "custom"]),
    customDescription: z.string().trim().max(500).optional(),
  })
  .superRefine((course, context) => {
    if (course.gradingType === "custom" && !course.customDescription) {
      context.addIssue({
        code: "custom",
        path: ["customDescription"],
        message: "Describe the custom grading system.",
      });
    }
  });

export async function createCourse(formData: FormData) {
  const parsed = courseSchema.safeParse({
    name: formData.get("name"),
    creditHours: formData.get("creditHours"),
    gradingType: formData.get("gradingType"),
    customDescription: formData.get("customDescription") || undefined,
  });
  if (!parsed.success) redirect("/member/courses?error=invalid-course");
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_member_course", {
    course_name: parsed.data.name,
    course_credit_hours: parsed.data.creditHours,
    course_grading_type: parsed.data.gradingType,
    course_custom_description: parsed.data.customDescription ?? null,
    course_grading_scale_id: null,
  });
  if (error) redirect("/member/courses?error=not-saved");
  redirect("/member/courses?status=created");
}

export async function archiveCourse(formData: FormData) {
  const parsed = z.string().uuid().safeParse(formData.get("courseId"));
  if (!parsed.success) redirect("/member/courses?error=not-archived");
  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_member_course", {
    course_id: parsed.data,
  });
  if (error) redirect("/member/courses?error=not-archived");
  redirect("/member/courses?status=archived");
}
