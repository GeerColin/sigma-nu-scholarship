import "server-only";

import { AppShell } from "@/components/app-shell";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export async function ChairAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireChairContext();
  const supabase = await createClient();

  const [{ data: chapter }, { data: semester }] = await Promise.all([
    supabase
      .from("chapters")
      .select("fraternity_name, chapter_name, institution_name")
      .eq("id", context.chapterId!)
      .single(),
    supabase
      .from("semesters")
      .select("id, name, timezone")
      .eq("chapter_id", context.chapterId!)
      .eq("active", true)
      .maybeSingle(),
  ]);

  let currentWeek: { label: string } | null = null;
  if (semester) {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("academic_weeks")
      .select("label")
      .eq("semester_id", semester.id)
      .lte("starts_on", today)
      .gte("ends_on", today)
      .maybeSingle();
    currentWeek = data;
  }

  return (
    <AppShell
      viewer={{
        name: context.memberName!,
        email: context.email,
        role: context.roles.includes("scholarship_chair")
          ? "Scholarship Chair"
          : "Admin",
      }}
      chapter={
        chapter
          ? {
              fraternityName: chapter.fraternity_name,
              chapterName: chapter.chapter_name,
              institutionName: chapter.institution_name,
            }
          : null
      }
      academicPeriod={
        semester
          ? {
              semesterName: semester.name,
              weekLabel: currentWeek?.label ?? null,
              timezone: semester.timezone,
            }
          : null
      }
    >
      {children}
    </AppShell>
  );
}
