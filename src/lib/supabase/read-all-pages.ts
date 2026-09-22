import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";

type Page<T> = {
  data: T[] | null;
  error: PostgrestError | null;
  status: number;
};

// Each call must construct a new, deterministically ordered query. Pagination
// is not retry: any error discards partial results and preserves fail-closed UI.
export async function readAllPages<T>(
  readPage: (from: number, to: number) => PromiseLike<Page<T>>,
): Promise<Page<T>> {
  const rows: T[] = [];
  for (;;) {
    const result = await readPage(rows.length, rows.length + 499);
    if (result.error) return { ...result, data: null };
    if (!result.data?.length) return { ...result, data: rows };
    rows.push(...result.data);
    // Continue to an empty page even when the provider caps pages below 500.
    if (rows.length > 100_000) {
      throw new Error("This report exceeds the supported read size.");
    }
  }
}
