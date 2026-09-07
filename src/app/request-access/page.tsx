import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requestAccess } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function RequestAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <Card className="w-full max-w-lg">
        <CardContent className="p-7 sm:p-9">
          <p className="text-sm font-bold tracking-[0.14em] text-[var(--warning)] uppercase">
            First sign-in
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--navy)]">
            Request chapter access
          </h1>
          <p className="mt-3 text-[var(--muted)]">
            Enter your name as it appears on the chapter roster. Your Google
            identity will be shown only to authorized administrators reviewing
            the request.
          </p>
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]"
            >
              We couldn’t record your request. Nothing was saved. Please check
              your name and try again.
            </p>
          )}
          <form action={requestAccess} className="mt-7 space-y-5">
            <label className="block">
              <span className="mb-2 block font-semibold">Full name</span>
              <input
                required
                name="requestedName"
                autoComplete="name"
                minLength={2}
                maxLength={150}
                className="min-h-12 w-full rounded-xl border bg-white px-4"
              />
            </label>
            <div className="rounded-xl bg-[var(--surface-subtle)] p-4 text-sm">
              <p className="font-semibold text-[var(--navy)]">
                Authenticated Google account
              </p>
              <p className="mt-1 text-[var(--muted)]">
                {data.user.user_metadata.full_name ?? "Name not provided"} ·{" "}
                {data.user.email}
              </p>
            </div>
            <Button type="submit" className="w-full">
              Submit access request
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
