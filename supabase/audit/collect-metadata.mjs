import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

// Metadata only: never fetch application data or credentials.
const sqlPath = path.resolve("supabase/audit/schema_metadata.sql");
const out = path.resolve("test-results/audit");
mkdirSync(out, { recursive: true });
const projects = {
  development: "bryppeounpmtobjwwpfs",
  production: "bxxbegnexwopamxuknru",
};
const snapshots = {};
for (const [environment, ref] of Object.entries(projects)) {
  const response = execFileSync(
    process.execPath,
    [
      "node_modules/supabase/dist/supabase.js",
      "db",
      "query",
      "--linked",
      "--project-ref",
      ref,
      "--file",
      sqlPath,
      "--output",
      "json",
    ],
    {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const metadata = JSON.parse(response).rows[0].metadata;
  snapshots[environment] = metadata;
  writeFileSync(
    path.join(out, `${environment}-metadata.json`),
    JSON.stringify(metadata, null, 2),
  );
  console.log(
    JSON.stringify({
      environment,
      ref,
      migrations: metadata.migrations,
      tables: metadata.tables.length,
      functions: metadata.functions.length,
      tablesWithoutRls: metadata.tables
        .filter((t) => !t.rls)
        .map((t) => t.name),
    }),
  );
}
const local = execFileSync(
  "docker",
  [
    "exec",
    "-i",
    "supabase_db_sigma-nu-scholarship",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-X",
    "-Atq",
    "-v",
    "ON_ERROR_STOP=1",
  ],
  {
    input: readFileSync(sqlPath),
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  },
);
snapshots.local = JSON.parse(local.trim());
writeFileSync(
  path.join(out, "local-metadata.json"),
  JSON.stringify(snapshots.local, null, 2),
);
for (const environment of Object.keys(projects)) {
  for (const kind of Object.keys(snapshots.local)) {
    const key = (row) =>
      typeof row === "string"
        ? row
        : JSON.stringify([
            row.table,
            row.name,
            row.args,
            row.role,
            row.privilege,
          ]);
    const expected = new Map(
      (snapshots.local[kind] ?? []).map((row) => [key(row), row]),
    );
    const actual = new Map(
      (snapshots[environment][kind] ?? []).map((row) => [key(row), row]),
    );
    const changed = [...expected]
      .filter(([id, row]) => !isDeepStrictEqual(row, actual.get(id)))
      .map(([id]) => id);
    const extra = [...actual.keys()].filter((id) => !expected.has(id));
    console.log(
      JSON.stringify({
        environment,
        kind,
        changedCount: changed.length,
        changed: changed.slice(0, 12),
        extraCount: extra.length,
        extra: extra.slice(0, 12),
      }),
    );
  }
}
