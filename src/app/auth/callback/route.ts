import { NextResponse, type NextRequest } from "next/server";
import { getTrustedCallbackRedirect } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        getTrustedCallbackRedirect(url.searchParams.get("next"), url.origin),
      );
  }
  return NextResponse.redirect(new URL("/login?error=callback", url.origin));
}
