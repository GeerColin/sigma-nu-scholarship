import { describe, expect, it, vi } from "vitest";
import { createReadFailure } from "@/lib/supabase/read-failure";

vi.mock("server-only", () => ({}));

describe("server-side read diagnostics", () => {
  it("retains only failed operation names, valid status, and known code shapes", () => {
    const error = createReadFailure("Could not load members.", [
      { operation: "members", error: { code: "57014" }, status: 500 },
      { operation: "alerts", error: null, status: 200 },
      { operation: "sessions", error: { code: "PGRST301" }, status: 401 },
    ]);
    expect(error.message).toBe("Could not load members.");
    expect((error.cause as Error).message).toBe(
      "Read failures: members[status=500, code=57014]; sessions[status=401, code=PGRST301]",
    );
  });

  it("does not retain provider payloads or arbitrary code/status content", () => {
    const providerError = {
      code: "synthetic-sensitive-value",
      message: "synthetic-provider-message",
      details: "synthetic-academic-data",
    };
    const error = createReadFailure("Could not load members.", [
      { operation: "members", error: providerError, status: Number.NaN },
      { operation: "alerts", error: { code: "" }, status: 0 },
    ]);
    expect((error.cause as Error).message).toBe(
      "Read failures: members[status=UNKNOWN, code=UNKNOWN]; alerts[status=0, code=UNKNOWN]",
    );
    expect(
      JSON.stringify(error, Object.getOwnPropertyNames(error)),
    ).not.toContain("synthetic-sensitive-value");
    expect((error.cause as Error).message).not.toContain(providerError.message);
    expect((error.cause as Error).message).not.toContain(providerError.details);
  });
});
