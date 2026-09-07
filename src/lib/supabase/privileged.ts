import "server-only";

import { createClient } from "@supabase/supabase-js";
import { requireSupabaseSecretKey } from "@/lib/env.server";
import { requireSupabasePublicEnv } from "@/lib/env";

/**
 * Creates an RLS-bypassing client for genuinely privileged server-only work.
 * Do not use this for ordinary member, proctor, Admin, or Chair requests; those
 * must use the publishable-key client plus the caller's Supabase Auth session.
 */
export function createPrivilegedClient() {
  const { url } = requireSupabasePublicEnv();
  const secretKey = requireSupabaseSecretKey();

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
