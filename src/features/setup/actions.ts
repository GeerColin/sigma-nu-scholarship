"use server";

import { redirect } from "next/navigation";
import { bootstrapChapterSchema } from "@/features/setup/validation";
import { createClient } from "@/lib/supabase/server";

export async function bootstrapChapter(formData: FormData) {
  const parsed = bootstrapChapterSchema.safeParse({
    bootstrapToken: formData.get("bootstrapToken"),
    fraternityName: formData.get("fraternityName"),
    chapterName: formData.get("chapterName"),
    institutionName: formData.get("institutionName"),
    chairName: formData.get("chairName"),
    confirmed: formData.get("confirmed"),
  });
  if (!parsed.success) redirect("/setup?error=invalid-setup" as never);

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  const { error } = await supabase.rpc("bootstrap_chapter", {
    bootstrap_token: parsed.data.bootstrapToken,
    fraternity_name: parsed.data.fraternityName,
    chapter_name: parsed.data.chapterName,
    institution_name: parsed.data.institutionName,
    initial_chair_name: parsed.data.chairName,
  });
  if (error) redirect("/setup?error=bootstrap-failed" as never);
  redirect("/setup?status=chapter-created" as never);
}
