import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyFailure,
  createDiagnosticState,
  diagnosticFetch,
  recordFailure,
  ReadFailure,
} from "@/lib/supabase/diagnostics";
import { onRequestError } from "@/instrumentation";

vi.mock("server-only", () => ({}));
afterEach(() => vi.restoreAllMocks());

describe("privacy-safe production read classification", () => {
  it.each([
    [{ name: "AuthSessionMissingError" }, undefined, "session_missing"],
    [{ code: "PGRST301" }, 401, "session_invalid"],
    [
      {
        name: "TypeError",
        message: "fetch failed",
        cause: { code: "ECONNRESET" },
      },
      undefined,
      "transport",
    ],
    [{ code: "", message: "TypeError: fetch failed" }, 0, "transport"],
    [{ code: "PGRST002" }, 503, "provider_unavailable"],
    [{ code: "PGRST003" }, 504, "timeout"],
    [{ code: "P0001" }, 400, "database"],
    [{ code: "42P01" }, 400, "database"],
    [
      { code: "42501", message: "violates row-level security policy" },
      403,
      "rls_denial",
    ],
    [
      { code: "42501", message: "permission denied for table" },
      403,
      "permission_denied",
    ],
    [
      { name: "TypeError", cause: { code: "UND_ERR_CONNECT_TIMEOUT" } },
      undefined,
      "timeout",
    ],
    [
      {
        code: "",
        message: "TypeError: fetch failed",
        details: "Caused by: UND_ERR_HEADERS_TIMEOUT",
      },
      0,
      "timeout",
    ],
    [
      {
        code: "57014",
        message: "canceling statement due to statement timeout",
      },
      500,
      "timeout",
    ],
    [
      { code: "57014", message: "canceling statement due to user request" },
      500,
      "database",
    ],
    [{ name: "AbortError" }, undefined, "transport"],
    [{ message: "SyntaxError: invalid JSON" }, 0, "unexpected_application"],
    [new Error("synthetic-private-value"), undefined, "unexpected_application"],
  ])("classifies %j without retaining its text", (error, status, category) => {
    expect(classifyFailure(error, status as number | undefined)).toBe(category);
  });

  it("emits only an explicitly constructed safe schema", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    recordFailure(
      "member_linkage",
      "missing_linkage",
      {
        code: "synthetic-secret",
        message: "synthetic-cookie",
        details: "synthetic-academic-row",
        headers: "synthetic-header",
        cause: { code: "UND_ERR_HEADERS_OVERFLOW", message: "synthetic-url" },
      },
      200,
      1.4,
      createDiagnosticState(),
    );
    const output = String(warn.mock.calls[0]?.[0]);
    for (const forbidden of [
      "synthetic-secret",
      "synthetic-cookie",
      "synthetic-academic-row",
      "synthetic-header",
      "synthetic-url",
    ])
      expect(output).not.toContain(forbidden);
    expect(JSON.parse(output)).toMatchObject({
      category: "missing_linkage",
      code: "UNKNOWN",
      status: 200,
      transport_code: "UND_ERR_HEADERS_OVERFLOW",
      duration_ms: 1,
    });
  });

  it("does not read response bodies, add retries, or modify authenticated fetch options", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = new Response("synthetic-private-response", {
      status: 503,
    });
    const bodyReader = vi.spyOn(response, "text");
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    const input =
      "https://synthetic.invalid/rest/v1/members?profile_id=synthetic-private-id";
    const init = {
      headers: { Authorization: "synthetic-credential" },
      cache: "no-store" as const,
    };
    expect(
      await diagnosticFetch(createDiagnosticState(), fetcher)(input, init),
    ).toBe(response);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(input, init);
    expect(bodyReader).not.toHaveBeenCalled();
    expect(response.bodyUsed).toBe(false);
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toMatch(
      /synthetic-private|synthetic-credential/,
    );
  });

  it("records transport failures once per attempt and preserves SDK error behavior", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failure = new TypeError("fetch failed", {
      cause: { code: "ECONNRESET", message: "synthetic-sensitive-url" },
    });
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(failure);
    await expect(
      diagnosticFetch(
        createDiagnosticState(),
        fetcher,
      )("https://synthetic.invalid/rest/v1/grade_submissions"),
    ).rejects.toBe(failure);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).not.toContain(
      "synthetic-sensitive-url",
    );
  });

  it("does not log any Next.js request, error payload or context", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await onRequestError(
      new Error("synthetic-sensitive-error"),
      {
        path: "/?synthetic-sensitive-query",
        method: "GET",
        headers: { cookie: "synthetic-sensitive-cookie" },
      },
      {
        routerKind: "App Router",
        routePath: "/members/[memberId]",
        routeType: "render",
        renderSource: "react-server-components",
        revalidateReason: undefined,
      },
    );
    expect(String(warn.mock.calls[0]?.[0])).not.toContain(
      "synthetic-sensitive",
    );
    expect(JSON.parse(String(warn.mock.calls[0]?.[0])).category).toBe(
      "unexpected_application",
    );
  });

  it("preserves a known read-failure category for request-error reporting", () => {
    expect(
      classifyFailure(new ReadFailure("Could not load members.", "transport")),
    ).toBe("transport");
  });
});
