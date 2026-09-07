import { GraduationCap, LockKeyhole } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { signInWithGoogle } from "@/features/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <BrandMark />
          <div>
            <p className="font-bold text-[var(--navy)]">Sigma Nu Scholarship</p>
            <p className="text-sm text-[var(--muted)]">
              Eta Chapter · Mercer University
            </p>
          </div>
        </div>
        <Card className="shadow-[0_24px_70px_rgba(17,41,75,0.12)]">
          <CardContent className="p-7 sm:p-9">
            <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-[var(--gold-soft)] text-[var(--warning)]">
              <GraduationCap className="size-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--navy)]">
              Academic check-in
            </h1>
            <p className="mt-3 text-[var(--muted)]">
              Use the Google account you want linked to your chapter membership.
            </p>
            {error && (
              <p
                role="alert"
                className="mt-5 rounded-xl bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]"
              >
                We couldn’t complete sign-in. No account changes were made.
                Please try again.
              </p>
            )}
            <form action={signInWithGoogle} className="mt-7">
              <Button type="submit" className="w-full">
                Continue with Google
              </Button>
            </form>
            <div className="mt-6 flex gap-3 border-t pt-5 text-sm text-[var(--muted)]">
              <LockKeyhole className="mt-0.5 size-4 shrink-0" />
              <p>
                Google verifies your identity. A chapter administrator must
                still approve access before you can view chapter information.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
