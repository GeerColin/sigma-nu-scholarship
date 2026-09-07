"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const requestAccessSchema = z.object({
  requestedName: z.string().trim().min(2).max(150),
});

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url as never);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestAccess(formData: FormData) {
  const parsed = requestAccessSchema.safeParse({
    requestedName: formData.get("requestedName"),
  });
  if (!parsed.success) redirect("/request-access?error=invalid-name");
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  const { error } = await supabase.from("access_requests").insert({
    profile_id: authData.user.id,
    requested_name: parsed.data.requestedName,
    authenticated_name:
      authData.user.user_metadata.full_name ??
      authData.user.user_metadata.name ??
      null,
    authenticated_email: authData.user.email ?? "",
  });
  if (error) redirect("/request-access?error=not-recorded");
  redirect("/awaiting-approval");
}
