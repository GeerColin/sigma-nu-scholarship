import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import {
  createDiagnosticState,
  diagnosticFetch,
  classifyFailure,
  recordFailure,
  ReadFailure,
} from "@/lib/supabase/diagnostics";

export async function updateSession(request: NextRequest) {
  if (
    !publicEnv.NEXT_PUBLIC_SUPABASE_URL ||
    !publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  // Supabase sends cache headers only on the first cookie write. Retain them
  // when rebuilding NextResponse on subsequent writes in the same request.
  const refreshHeaders: Record<string, string> = {};
  const diagnostic = createDiagnosticState("proxy");
  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      global: { fetch: diagnosticFetch(diagnostic) },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          Object.assign(refreshHeaders, headers);
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(refreshHeaders).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
        },
      },
    },
  );
  const { error } = await supabase.auth.getClaims().catch((error: unknown) => {
    const category = classifyFailure(error);
    recordFailure("auth", category, error, undefined, undefined, diagnostic);
    throw new ReadFailure(
      "Could not verify your sign-in. Please try again.",
      category,
    );
  });
  if (error)
    recordFailure(
      "auth",
      classifyFailure(error, error.status),
      error,
      error.status,
      undefined,
      diagnostic,
    );
  return response;
}
