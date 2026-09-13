import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

function mockClient(
  auth: object,
  member: object,
  request: object = { data: null, error: null, status: 200 },
) {
  const from = vi.fn((table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => (table === "members" ? member : request),
    };
    return chain;
  });
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue(auth) },
    from,
  } as unknown as Awaited<ReturnType<typeof createClient>>);
  return from;
}
const authenticated = {
  data: {
    user: { id: "synthetic-profile", email: "synthetic@example.invalid" },
  },
  error: null,
};

describe("fail-closed authenticated context reads", () => {
  it("does not query chapter linkage until identity verification succeeds", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const from = mockClient(
      {
        data: { user: null },
        error: { name: "AuthSessionMissingError", status: 400 },
      },
      {},
    );
    expect(await getCurrentUserContext()).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });
  it.each([0, 504])(
    "does not mistake an auth transport/provider failure (%s) for a signed-out session",
    async (status) => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const from = mockClient(
        {
          data: { user: null },
          error: {
            name: "AuthRetryableFetchError",
            status,
            message: "synthetic-private-provider-message",
          },
        },
        {},
      );
      await expect(getCurrentUserContext()).rejects.toThrow(
        "Could not verify your sign-in.",
      );
      expect(from).not.toHaveBeenCalled();
    },
  );
  it.each(["members", "access_requests"])(
    "does not silently turn a failed %s lookup into missing linkage",
    async (table) => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const failed = {
        data: null,
        error: {
          code: "PGRST002",
          message: "synthetic-private-provider-message",
        },
        status: 503,
      };
      const success = { data: null, error: null, status: 200 };
      mockClient(
        authenticated,
        table === "members" ? failed : success,
        table === "access_requests" ? failed : success,
      );
      await expect(getCurrentUserContext()).rejects.toThrow(
        "Could not load your account access.",
      );
      expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(
        "synthetic-private-provider-message",
      );
    },
  );
  it("preserves the legitimate unlinked-account state after successful reads", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockClient(authenticated, { data: null, error: null, status: 200 });
    expect(await getCurrentUserContext()).toMatchObject({
      memberId: null,
      chapterId: null,
      roles: [],
    });
    expect(JSON.parse(String(warn.mock.calls.at(-1)?.[0]))).toMatchObject({
      category: "missing_linkage",
      session: "verified",
    });
  });
});
