// Isolated login/anonymous browser smoke test; no hosted credentials or email.
import { execFileSync, spawn } from "node:child_process";
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
assert.equal(local.API_URL, "http://127.0.0.1:57321");
assert.match(local.PUBLISHABLE_KEY, /^sb_publishable_/);
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3011",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3011",
      NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY,
      SUPABASE_SECRET_KEY: "",
      BOOTSTRAP_TOKEN_SHA256: "",
      RESEND_API_KEY: "",
      RESEND_WEBHOOK_SECRET: "",
      EMAIL_MODE: "mock",
    },
  },
);
console.log(`Local audit preview process: ${child.pid}`);
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
