import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabasePublicEnv } from "@/lib/env";
import { diagnosticFetch } from "@/lib/supabase/diagnostics";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = requireSupabasePublicEnv();
  return createServerClient(url, publishableKey, {
    global: { fetch: diagnosticFetch() },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies; the proxy refreshes sessions.
        }
      },
    },
  });
}
