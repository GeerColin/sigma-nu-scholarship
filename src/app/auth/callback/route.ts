import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function trustedNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(trustedNextPath(url.searchParams.get("next")), url.origin),
      );
  }
  return NextResponse.redirect(new URL("/login?error=callback", url.origin));
}
