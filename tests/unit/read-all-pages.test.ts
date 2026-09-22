import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readAllPages } from "@/lib/supabase/read-all-pages";

describe("complete paged report reads", () => {
  it.each([500, 100])(
    "reads beyond 1000 rows with provider cap %s",
    async (cap) => {
      const synthetic = Array.from({ length: 1792 }, (_, id) => ({ id }));
      const page = vi.fn(async (from: number, to: number) => ({
        data: synthetic.slice(from, Math.min(to + 1, from + cap)),
        error: null,
        status: 200,
      }));
      const result = await readAllPages(page);
      expect(result.data).toEqual(synthetic);
      expect(page).toHaveBeenLastCalledWith(1792, 2291);
    },
  );
  it("discards earlier pages if a later request fails, without retrying", async () => {
    const error = {
      code: "PGRST000",
      message: "Synthetic failure",
      details: "",
      hint: "",
      name: "PostgrestError",
    };
    const page = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: 1 }], error: null, status: 200 })
      .mockResolvedValueOnce({ data: null, error, status: 503 });
    expect(await readAllPages(page)).toEqual({
      data: null,
      error,
      status: 503,
    });
    expect(page).toHaveBeenCalledTimes(2);
  });
});
