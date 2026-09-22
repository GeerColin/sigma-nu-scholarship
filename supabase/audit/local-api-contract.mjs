// Read-only local PostgREST query-shape checks. Keys stay in memory, never output.
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const local = JSON.parse(
  execFileSync(
    process.execPath,
    ["node_modules/supabase/dist/supabase.js", "status", "--output", "json"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ),
);
const api = new URL(local.API_URL);
assert.equal(api.hostname, "127.0.0.1");
assert.equal(api.port, "57321");
const shapes = [
  [
    "grade_entries",
    "submission_id,grade_submissions!inner(is_current,academic_weeks!inner(semester_id))",
    "grade_submissions.academic_weeks.semester_id",
  ],
  [
    "grade_submissions",
    "id,academic_weeks!inner(label,sequence_number,semester_id)",
    "academic_weeks.semester_id",
  ],
  [
    "custom_grading_reviews",
    "course_id,courses!inner(member_id)",
    "courses.member_id",
  ],
];
for (const [table, select, filter] of shapes) {
  const url = new URL(`/rest/v1/${table}`, api);
  url.searchParams.set("select", select);
  url.searchParams.set(filter, "eq.a6000000-0000-4000-8000-000000000001");
  url.searchParams.set("offset", "1792");
  url.searchParams.set("limit", "500");
  url.searchParams.set("order", "id.asc");
  const response = await fetch(url, {
    headers: { apikey: local.PUBLISHABLE_KEY ?? local.ANON_KEY },
    signal: AbortSignal.timeout(10_000),
  });
  console.log(
    JSON.stringify({
      table,
      queryAccepted: response.ok,
      status: response.status,
    }),
  );
  assert.equal(response.status, 200);
  // Anonymous RLS and deliberately nonexistent synthetic IDs must return empty.
  assert.deepEqual(await response.json(), []);
}
