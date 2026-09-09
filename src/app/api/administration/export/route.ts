import { getCurrentUserContext } from "@/lib/auth/context";
import { getProtectedSurfaceRedirect } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  createSemesterExportArchive,
  safeExportFilename,
  type ExportRow,
  type SemesterExportData,
} from "@/features/administration/semester-export";

const PAGE_SIZE = 1000;

async function fetchAllRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  chapterId?: string,
) {
  const rows: ExportRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from(table)
      .select("*")
      .order(table === "chapter_settings" ? "chapter_id" : "id", {
        ascending: true,
      })
      .range(from, from + PAGE_SIZE - 1);
    if (chapterId) query = query.eq("chapter_id", chapterId);
    const { data, error } = await query;
    if (error) throw new Error(`Could not export ${table}.`);
    rows.push(...((data ?? []) as ExportRow[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

function ids(rows: ExportRow[]) {
  return new Set(rows.map((row) => String(row.id)));
}

export async function GET(request: Request) {
  const context = await getCurrentUserContext();
  if (getProtectedSurfaceRedirect(context, "chair")) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const semesterId = new URL(request.url).searchParams.get("semesterId");
  if (
    !semesterId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      semesterId,
    )
  ) {
    return Response.json(
      { error: "A valid semester is required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: semester, error: semesterError } = await supabase
    .from("semesters")
    .select("*")
    .eq("chapter_id", context!.chapterId!)
    .eq("id", semesterId)
    .maybeSingle();
  if (semesterError) {
    return Response.json(
      { error: "The semester could not be loaded." },
      { status: 500 },
    );
  }
  if (!semester) {
    return Response.json({ error: "Semester not found." }, { status: 404 });
  }

  try {
    const chapterTables = [
      "members",
      "member_roles",
      "academic_weeks",
      "grading_scales",
      "courses",
      "custom_grading_reviews",
      "grade_submissions",
      "grade_entries",
      "academic_alerts",
      "study_hour_rule_sets",
      "study_hour_assignments",
      "study_sessions",
      "email_templates",
      "email_batches",
      "email_messages",
      "chapter_settings",
      "audit_log",
    ] as const;
    const unscopedTables = [
      "study_hour_bands",
      "email_delivery_events",
    ] as const;
    const results = await Promise.all([
      ...chapterTables.map((table) =>
        fetchAllRows(supabase, table, context!.chapterId!),
      ),
      ...unscopedTables.map((table) => fetchAllRows(supabase, table)),
    ]);
    const all = Object.fromEntries(
      [...chapterTables, ...unscopedTables].map((table, index) => [
        table,
        results[index]!,
      ]),
    ) as Record<string, ExportRow[]>;

    const weeks = all.academic_weeks!.filter(
      (row) => row.semester_id === semesterId,
    );
    const weekIds = ids(weeks);
    const courses = all.courses!.filter(
      (row) => row.semester_id === semesterId,
    );
    const courseIds = ids(courses);
    const scaleIds = new Set(
      courses
        .map((row) => row.grading_scale_id)
        .filter(Boolean)
        .map(String),
    );
    const submissions = all.grade_submissions!.filter((row) =>
      weekIds.has(String(row.week_id)),
    );
    const submissionIds = ids(submissions);
    const assignments = all.study_hour_assignments!.filter((row) =>
      weekIds.has(String(row.week_id)),
    );
    const ruleIds = new Set([
      ...all.study_hour_rule_sets!.map((row) => String(row.id)),
      ...assignments.map((row) => String(row.rule_set_id)),
    ]);
    const batches = all.email_batches!.filter((row) =>
      weekIds.has(String(row.week_id)),
    );
    const batchIds = ids(batches);
    const messages = all.email_messages!.filter((row) =>
      batchIds.has(String(row.batch_id)),
    );
    const messageIds = ids(messages);

    const data: SemesterExportData = {
      members: all.members!,
      member_roles: all.member_roles!,
      semesters: [semester as ExportRow],
      academic_weeks: weeks,
      grading_scales: all.grading_scales!.filter((row) =>
        scaleIds.has(String(row.id)),
      ),
      courses,
      custom_grading_reviews: all.custom_grading_reviews!.filter((row) =>
        courseIds.has(String(row.course_id)),
      ),
      grade_submissions: submissions,
      grade_entries: all.grade_entries!.filter((row) =>
        submissionIds.has(String(row.submission_id)),
      ),
      academic_alerts: all.academic_alerts!.filter((row) =>
        submissionIds.has(String(row.submission_id)),
      ),
      study_hour_rule_sets: all.study_hour_rule_sets!,
      study_hour_bands: all.study_hour_bands!.filter((row) =>
        ruleIds.has(String(row.rule_set_id)),
      ),
      study_hour_assignments: assignments,
      study_sessions: all.study_sessions!.filter((row) =>
        weekIds.has(String(row.week_id)),
      ),
      email_templates: all.email_templates!,
      email_batches: batches,
      email_messages: messages,
      email_delivery_events: all.email_delivery_events!.filter((row) =>
        messageIds.has(String(row.message_id)),
      ),
      chapter_settings: all.chapter_settings!,
      audit_log: all.audit_log!,
    };
    const archive = createSemesterExportArchive({
      semester: semester as ExportRow,
      generatedAt: new Date().toISOString(),
      data,
    });
    const filename = `${safeExportFilename(semester.name)}-scholarship-export.zip`;
    return new Response(Buffer.from(archive), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "The export could not be generated." },
      { status: 500 },
    );
  }
}
