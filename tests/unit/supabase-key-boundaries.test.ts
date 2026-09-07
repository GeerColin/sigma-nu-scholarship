import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Supabase API-key boundaries", () => {
  it("documents current publishable and secret variable names without legacy names", () => {
    const example = source(".env.example");
    expect(example).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=");
    expect(example).toContain("SUPABASE_SECRET_KEY=");
    expect(example).not.toContain("SUPABASE_ANON_KEY");
    expect(example).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("uses the publishable key for browser, session-aware server, and proxy clients", () => {
    expect(source("src/lib/env.ts")).toContain('"sb_publishable_"');

    for (const path of [
      "src/lib/supabase/client.ts",
      "src/lib/supabase/server.ts",
      "src/lib/supabase/proxy.ts",
    ]) {
      const contents = source(path);
      expect(contents).toMatch(
        /requireSupabasePublicEnv|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
      );
      expect(contents).not.toContain("SUPABASE_SECRET_KEY");
      expect(contents).not.toContain("createPrivilegedClient");
    }
  });

  it("keeps the RLS-bypassing key behind explicit server-only modules", () => {
    const environment = source("src/lib/env.server.ts");
    const privileged = source("src/lib/supabase/privileged.ts");
    expect(environment).toContain('import "server-only"');
    expect(privileged).toContain('import "server-only"');
    expect(environment).toContain("SUPABASE_SECRET_KEY");
    expect(privileged).toContain("requireSupabaseSecretKey");
    expect(privileged).toContain("RLS-bypassing");
  });

  it("does not expose a secret-key variable through a NEXT_PUBLIC name", () => {
    expect(source(".env.example")).not.toMatch(
      /NEXT_PUBLIC_[A-Z0-9_]*SECRET_KEY/,
    );
    expect(source(".env.example")).not.toMatch(/sb_secret_[A-Za-z0-9_-]{20,}/);
    expect(source("src/lib/env.ts")).not.toContain("SUPABASE_SECRET_KEY");
  });
});
