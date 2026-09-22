// Synthetic-only concurrency regression. Never accepts a hosted connection.
import { execFileSync, spawn } from "node:child_process";
import assert from "node:assert/strict";

const database = "sigma_nu_audit_20260921";
const args = [
  "exec",
  "-i",
  "supabase_db_sigma-nu-scholarship",
  "psql",
  "-U",
  "postgres",
  "-d",
  database,
  "-X",
  "-qAt",
  "-v",
  "ON_ERROR_STOP=1",
];
const sql = (input) =>
  execFileSync("docker", args, { input, encoding: "utf8" }).trim();
const chapter = "a2000000-0000-4000-8000-000000000010";
const member = "a2000000-0000-4000-8000-000000000011";
const semester = "a2000000-0000-4000-8000-000000000020";
const user = "a2000000-0000-4000-8000-000000000001";
assert.equal(sql("select current_database()"), database);
assert.equal(
  sql("select count(*) from public.members"),
  "0",
  "Requires the empty isolated audit database",
);

function run(input, onOutput = () => {}) {
  const child = spawn("docker", args);
  child.stdout.on("data", (chunk) => onOutput(chunk.toString()));
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  child.stdin.end(input);
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) =>
      resolve({
        code,
        limitDenied: stderr.includes("at most 8 active courses"),
      }),
    );
  });
}

try {
  sql(`begin;
    insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data,aud,role)
    values ('${user}','synthetic-race@example.test','{}','{}','authenticated','authenticated');
    insert into public.chapters(id,fraternity_name,chapter_name,institution_name) values ('${chapter}','Synthetic','Audit Race','Synthetic');
    insert into public.members(id,chapter_id,profile_id,full_name,status) values ('${member}','${chapter}','${user}','Synthetic Race Member','active');
    insert into public.member_roles(chapter_id,member_id,role) values ('${chapter}','${member}','member');
    insert into public.semesters(id,chapter_id,name,start_date,end_date,default_deadline_weekday,default_deadline_time,active)
    values ('${semester}','${chapter}','Synthetic Race',current_date-1,current_date+10,0,'19:00',true);
    insert into public.courses(chapter_id,member_id,semester_id,name,credit_hours,grading_type)
    select '${chapter}','${member}','${semester}','Synthetic '||n,3,'percentage' from generate_series(1,7) n;
    commit;`);
  const identity = `set local role authenticated; select set_config('request.jwt.claim.sub','${user}',true);`;
  let signalReady;
  const ready = new Promise((resolve) => {
    signalReady = resolve;
  });
  const first = run(
    `begin; ${identity}
    select public.create_member_course('Synthetic eighth',3,'percentage');
    \\echo AUDIT_FIRST_INSERTED
    select pg_sleep(2); commit;`,
    (output) => {
      if (output.includes("AUDIT_FIRST_INSERTED")) signalReady();
    },
  );
  // If connection one fails before its marker, never wait indefinitely.
  await Promise.race([
    ready,
    first.then((result) => {
      assert.equal(result.code, 0);
    }),
  ]);
  const second = run(
    `begin; ${identity} select public.create_member_course('Synthetic competing eighth',3,'percentage'); commit;`,
  );
  const results = await Promise.all([first, second]);
  const count = Number(
    sql(
      `select count(*) from public.courses where member_id='${member}' and archived_at is null`,
    ),
  );
  console.log(
    JSON.stringify({
      scenario: "two simultaneous adds at seven courses",
      activeCourses: count,
      transactions: results,
    }),
  );
  assert.equal(
    count,
    8,
    "Concurrent adds must not exceed the active course limit",
  );
  assert.equal(results[0].code, 0);
  assert.equal(results[1].limitDenied, true);
} finally {
  sql(`begin;
    -- This database was verified empty before seeding. Audit history is
    -- append-only, so remove this isolated test run with owner-only TRUNCATE.
    truncate public.audit_log;
    delete from public.courses where chapter_id='${chapter}';
    delete from public.semesters where chapter_id='${chapter}';
    delete from public.member_roles where chapter_id='${chapter}';
    delete from public.members where chapter_id='${chapter}';
    delete from public.application_configuration where chapter_id='${chapter}';
    delete from public.chapters where id='${chapter}';
    delete from auth.users where id='${user}'; commit;`);
}
