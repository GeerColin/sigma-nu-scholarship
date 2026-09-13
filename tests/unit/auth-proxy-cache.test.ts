import type { CookieMethodsServer } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/proxy";

vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
vi.mock("@/lib/env", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "https://synthetic.invalid",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable",
  },
}));
afterEach(() => vi.restoreAllMocks());

describe("SSR refresh response cache control", () => {
  it("forwards refreshed cookies to the same render and preserves no-store headers across writes", async () => {
    let methods: CookieMethodsServer | undefined;
    vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
      methods = options.cookies as CookieMethodsServer;
      return {
        auth: {
          getClaims: async () => {
            await methods!.setAll!(
              [
                {
                  name: "synthetic-session",
                  value: "synthetic-token",
                  options: { path: "/" },
                },
              ],
              {
                "Cache-Control": "private, no-store",
                Expires: "0",
                Pragma: "no-cache",
              },
            );
            await methods!.setAll!(
              [
                {
                  name: "synthetic-session",
                  value: "synthetic-refreshed-token",
                  options: { path: "/" },
                },
              ],
              {},
            );
            return { data: {}, error: null };
          },
        },
      } as unknown as ReturnType<typeof createServerClient>;
    });
    const request = new NextRequest("https://synthetic.invalid/members");
    const response = await updateSession(request);
    expect(request.cookies.get("synthetic-session")?.value).toBe(
      "synthetic-refreshed-token",
    );
    expect(response.cookies.get("synthetic-session")?.value).toBe(
      "synthetic-refreshed-token",
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Expires")).toBe("0");
    expect(response.headers.get("Pragma")).toBe("no-cache");
  });
});
