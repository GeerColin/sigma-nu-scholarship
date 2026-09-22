import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  send: vi.fn(),
  createTransport: vi.fn(),
}));
vi.mock("@/lib/auth/guards", () => ({
  requireChairContext: vi.fn(async () => ({ chapterId: "synthetic-chapter" })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("@/lib/email/transport", () => ({
  createEmailTransport: mocks.createTransport,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: mocks.rpc,
    from: (table: string) => {
      const result =
        table === "chapter_settings"
          ? { data: { email_from: "synthetic@example.test" }, error: null }
          : {
              data: [1, 2].map((id) => ({
                id: String(id),
                recipient_email: "synthetic@example.test",
                final_subject: "Synthetic",
                final_body: "Synthetic",
                idempotency_key: `synthetic-${id}`,
              })),
              error: null,
            };
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => result,
        then: (resolve: (value: typeof result) => unknown) =>
          Promise.resolve(result).then(resolve),
      };
      return query;
    },
  }),
}));

import { sendApprovedEmailBatch } from "@/features/email/actions";
function form() {
  const data = new FormData();
  data.set("batchId", "a3000000-0000-4000-8000-000000000001");
  return data;
}

describe("email delivery acknowledgements", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.createTransport.mockReturnValue({ send: mocks.send });
    mocks.send.mockResolvedValue({
      providerMessageId: "synthetic-provider-id",
    });
    mocks.rpc.mockResolvedValue({ error: null });
  });

  it("does not queue a batch when transport configuration fails", async () => {
    mocks.createTransport.mockImplementation(() => {
      throw new Error("Missing configuration");
    });
    await expect(sendApprovedEmailBatch(form())).rejects.toThrow(
      "error=batch-not-sendable",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    "stops on a database acknowledgement failure (throws: %s)",
    async (throws) => {
      mocks.rpc.mockResolvedValueOnce({ error: null });
      if (throws)
        mocks.rpc.mockRejectedValueOnce(
          new Error("Synthetic transport failure"),
        );
      else mocks.rpc.mockResolvedValueOnce({ error: { code: "PGRST000" } });
      await expect(sendApprovedEmailBatch(form())).rejects.toThrow(
        "error=delivery-status-unknown",
      );
      expect(mocks.send).toHaveBeenCalledTimes(1);
      expect(mocks.rpc).toHaveBeenCalledTimes(2);
      expect(mocks.rpc).toHaveBeenLastCalledWith(
        "record_email_send_result_v2",
        expect.objectContaining({ succeeded: true }),
      );
    },
  );
  it("reports partial delivery failure instead of a success redirect", async () => {
    mocks.send.mockRejectedValueOnce(new Error("Synthetic rejection"));
    await expect(sendApprovedEmailBatch(form())).rejects.toThrow(
      "error=delivery-incomplete",
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      "record_email_send_result_v2",
      expect.objectContaining({
        succeeded: false,
        failure_code: "transport_error",
      }),
    );
  });
  it("reports success only after every accepted message is recorded", async () => {
    await expect(sendApprovedEmailBatch(form())).rejects.toThrow("status=sent");
    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
  });
});
