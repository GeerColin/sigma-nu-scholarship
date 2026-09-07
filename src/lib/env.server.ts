import "server-only";

import { z } from "zod";

const supabaseSecretKeySchema = z
  .string()
  .min(20)
  .startsWith(
    "sb_secret_",
    "SUPABASE_SECRET_KEY must be a current Supabase secret key.",
  );

/**
 * Returns the RLS-bypassing Supabase secret key for narrowly scoped,
 * privileged server operations. Ordinary authenticated requests must use the
 * publishable-key server client in `src/lib/supabase/server.ts`.
 */
export function requireSupabaseSecretKey() {
  const result = supabaseSecretKeySchema.safeParse(
    process.env.SUPABASE_SECRET_KEY,
  );
  if (!result.success) {
    throw new Error("Privileged Supabase server access is not configured.");
  }
  return result.data;
}
