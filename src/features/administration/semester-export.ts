import { strToU8, zipSync } from "fflate";

export const EXPORT_COLUMNS = {
  members: [
    "id",
    "chapter_id",
    "full_name",
    "status",
    "profile_id",
    "created_at",
    "updated_at",
    "archived_at",
  ],
  member_roles: [
    "id",
    "chapter_id",
    "member_id",
    "role",
    "active",
    "granted_by",
    "granted_at",
    "revoked_at",
  ],
  semesters: [
    "id",
    "chapter_id",
    "name",
    "start_date",
    "end_date",
    "default_deadline_weekday",
    "default_deadline_time",
    "timezone",
    "gpa_weighting",
    "active",
    "created_at",
    "updated_at",
  ],
  academic_weeks: [
    "id",
    "chapter_id",
    "semester_id",
    "sequence_number",
    "label",
    "starts_on",
    "ends_on",
    "deadline_at",
    "deadline_overridden",
    "created_at",
    "updated_at",
  ],
  grading_scales: [
    "id",
    "chapter_id",
    "name",
    "version",
    "scale",
    "active",
    "created_by",
    "created_at",
  ],
  courses: [
    "id",
    "chapter_id",
    "member_id",
    "semester_id",
    "name",
    "credit_hours",
    "grading_type",
    "grading_scale_id",
    "custom_grading_description",
    "archived_at",
    "created_at",
    "updated_at",
  ],
  custom_grading_reviews: [
    "id",
    "chapter_id",
    "course_id",
    "treatment",
    "conversion",
    "reason",
    "reviewed_by",
    "created_at",
  ],
  grade_submissions: [
    "id",
    "chapter_id",
    "member_id",
    "week_id",
    "revision_number",
    "previous_revision_id",
    "submitted_at",
    "original_submitted_at",
    "deadline_at_snapshot",
    "original_timing",
    "revision_timing",
    "is_current",
    "estimated_gpa_snapshot",
    "included_course_count",
    "active_course_count",
    "created_at",
  ],
  grade_entries: [
    "id",
    "chapter_id",
    "submission_id",
    "course_id",
    "course_name_snapshot",
    "credit_hours_snapshot",
    "grading_type_snapshot",
    "grading_scale_snapshot",
    "reported_value",
    "included_in_gpa",
    "gpa_points",
    "letter_equivalent",
    "created_at",
  ],
  academic_alerts: [
    "id",
    "chapter_id",
    "member_id",
    "course_id",
    "submission_id",
    "alert_type",
    "details",
    "acknowledged_at",
    "acknowledged_by",
    "created_at",
  ],
  study_hour_rule_sets: [
    "id",
    "chapter_id",
    "version",
    "d_adjustment_hours",
    "f_adjustment_hours",
    "maximum_hours",
    "active",
    "created_by",
    "created_at",
  ],
  study_hour_bands: [
    "id",
    "rule_set_id",
    "minimum_gpa",
    "maximum_gpa",
    "base_hours",
    "sort_order",
  ],
  study_hour_assignments: [
    "id",
    "chapter_id",
    "member_id",
    "week_id",
    "rule_set_id",
    "estimated_gpa_used",
    "had_d",
    "had_f",
    "automatic_hours",
    "override_hours",
    "override_reason",
    "override_actor",
    "override_at",
    "final_hours",
    "state",
    "frozen_at",
    "proposed_hours",
    "created_at",
    "updated_at",
  ],
  study_sessions: [
    "id",
    "chapter_id",
    "member_id",
    "proctor_member_id",
    "week_id",
    "session_date",
    "duration_minutes",
    "notes",
    "voided_at",
    "voided_by",
    "created_at",
    "updated_at",
  ],
  email_templates: [
    "id",
    "chapter_id",
    "template_type",
    "name",
    "subject_template",
    "body_template",
    "version",
    "active",
    "created_by",
    "created_at",
  ],
  email_batches: [
    "id",
    "chapter_id",
    "week_id",
    "batch_type",
    "state",
    "idempotency_key",
    "approved_by",
    "approved_at",
    "created_by",
    "created_at",
    "updated_at",
  ],
  email_messages: [
    "id",
    "chapter_id",
    "batch_id",
    "member_id",
    "recipient_email",
    "recipient_name",
    "message_type",
    "final_subject",
    "final_body",
    "state",
    "selected",
    "idempotency_key",
    "provider_message_id",
    "sent_at",
    "created_at",
    "updated_at",
  ],
  email_delivery_events: [
    "id",
    "message_id",
    "provider_event_id",
    "event_type",
    "payload",
    "occurred_at",
    "received_at",
  ],
  chapter_settings: [
    "chapter_id",
    "percentage_alert_drop",
    "letter_alert_steps",
    "email_from",
    "email_reply_to",
    "updated_by",
    "updated_at",
  ],
  audit_log: [
    "id",
    "chapter_id",
    "actor_profile_id",
    "action",
    "entity_type",
    "entity_id",
    "before_state",
    "after_state",
    "reason",
    "request_id",
    "created_at",
  ],
} as const;

export type ExportTableName = keyof typeof EXPORT_COLUMNS;
export type ExportRow = Record<string, unknown>;
export type SemesterExportData = Record<ExportTableName, ExportRow[]>;

function csvValue(value: unknown) {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function rowsToCsv(rows: ExportRow[], columns: readonly string[]) {
  return [
    columns.map(csvValue).join(","),
    ...rows.map((row) =>
      columns.map((column) => csvValue(row[column])).join(","),
    ),
  ].join("\r\n");
}

export function createSemesterExportArchive({
  semester,
  generatedAt,
  data,
}: {
  semester: ExportRow;
  generatedAt: string;
  data: SemesterExportData;
}) {
  const files: Record<string, Uint8Array> = {};
  const counts: Record<string, number> = {};

  for (const tableName of Object.keys(EXPORT_COLUMNS) as ExportTableName[]) {
    const rows = data[tableName];
    counts[tableName] = rows.length;
    files[`${tableName}.csv`] = strToU8(
      rowsToCsv(rows, EXPORT_COLUMNS[tableName]),
    );
  }

  files["manifest.json"] = strToU8(
    JSON.stringify(
      {
        format: "sigma-nu-scholarship-semester-export",
        version: 1,
        generated_at: generatedAt,
        semester,
        files: Object.fromEntries(
          Object.entries(counts).map(([name, count]) => [
            `${name}.csv`,
            { table: name, row_count: count },
          ]),
        ),
        notes: [
          "Member, role, rule, template, chapter setting, and audit files are chapter-wide supporting records.",
          "Academic, study-session, alert, and email activity files are filtered to the selected semester.",
          "The export is read-only and contains no authentication credentials or API keys.",
        ],
      },
      null,
      2,
    ),
  );

  return zipSync(files, { level: 6 });
}

export function safeExportFilename(value: string) {
  const safe = value
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return safe || "semester";
}
