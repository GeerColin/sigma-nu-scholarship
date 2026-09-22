// Local-only clean migration replay. Refuses to overwrite an existing database.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";

const container = "supabase_db_sigma-nu-scholarship";
const database = "sigma_nu_audit_replay_20260921";
const docker = (args, input) =>
  execFileSync("docker", ["exec", "-i", container, ...args], {
    input,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
const psql = (db, input, user = "postgres") =>
  docker(
    ["psql", "-U", user, "-d", db, "-X", "-qAt", "-v", "ON_ERROR_STOP=1"],
    input,
  ).trim();
assert.equal(
  psql(
    "postgres",
    `select count(*) from pg_database where datname='${database}'`,
  ),
  "0",
  "Choose a new isolated audit database; never overwrite",
);
psql("postgres", `create database ${database}`);
const schemaOnly = docker([
  "pg_dump",
  "-U",
  "supabase_admin",
  "-d",
  "postgres",
  "--schema-only",
  "--clean",
  "--if-exists",
]);
psql(database, schemaOnly, "supabase_admin");
assert.equal(
  psql(
    database,
    "select (select count(*) from auth.users)+(select count(*) from public.members)",
  ),
  "0",
);
psql(
  database,
  `
  drop schema public cascade;
  create schema public authorization pg_database_owner;
  grant usage on schema public to postgres, anon, authenticated, service_role;
  grant all on schema public to postgres, service_role;
  alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
`,
);
mkdirSync("test-results/audit", { recursive: true });
const files = readdirSync("supabase/migrations")
  .filter((file) => file.endsWith(".sql"))
  .sort();
const catalogSql = readFileSync("supabase/audit/schema_metadata.sql", "utf8");
for (const file of files) {
  psql(database, readFileSync(`supabase/migrations/${file}`, "utf8"));
  console.log(`Replayed ${file}`);
  if (file === "202609200026_grade_check_scheduling.sql") {
    const baseline = JSON.parse(psql(database, catalogSql));
    const deployed = JSON.parse(
      readFileSync("test-results/audit/production-metadata.json", "utf8"),
    );
    writeFileSync(
      "test-results/audit/replay-baseline-metadata.json",
      JSON.stringify(baseline, null, 2),
    );
    // Physical column order may differ after migrations; compare column objects by identity.
    for (const kind of Object.keys(baseline).filter(
      (kind) => kind !== "migrations",
    )) {
      const key = (row) =>
        JSON.stringify([
          row.table,
          row.name,
          row.args,
          row.role,
          row.privilege,
        ]);
      const live = new Map(
        (deployed[kind] ?? []).map((row) => [key(row), row]),
      );
      const fresh = new Map(
        (baseline[kind] ?? []).map((row) => [key(row), row]),
      );
      const differences = [...fresh].filter(
        ([id, row]) => !isDeepStrictEqual(row, live.get(id)),
      );
      const extra = [...live.keys()].filter((id) => !fresh.has(id));
      console.log(
        JSON.stringify({
          comparison: "fresh repository baseline vs captured production",
          kind,
          changed: differences.length,
          extra: extra.length,
        }),
      );
      assert.equal(
        differences.length + extra.length,
        0,
        `Unexpected ${kind} baseline drift`,
      );
    }
  }
}
writeFileSync(
  "test-results/audit/replay-with-fixes-metadata.json",
  psql(database, catalogSql),
);
console.log(
  JSON.stringify({
    database,
    migrationsReplayed: files.length,
    applicationRows: Number(
      psql(database, "select count(*) from public.members"),
    ),
  }),
);
