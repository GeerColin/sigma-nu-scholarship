import { Clock3 } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { signOut } from "@/features/auth/actions";
import { getCurrentUserContext } from "@/lib/auth/context";

export default async function AwaitingApprovalPage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");
  if (context.memberId) redirect("/");
  if (!context.accessRequestStatus) redirect("/request-access");
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--gold-soft)] text-[var(--warning)]">
            <Clock3 className="size-7" />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-[var(--navy)]">
            {context.accessRequestStatus === "rejected"
              ? "Access request not approved"
              : "Awaiting approval"}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-[var(--muted)]">
            {context.accessRequestStatus === "rejected"
              ? "A chapter administrator did not link this Google account. Contact the Scholarship Chair if you believe this is a mistake."
              : "Your request is recorded. The Scholarship Chair or an administrator will match your Google account to the chapter roster."}
          </p>
          <p className="mt-5 rounded-xl bg-[var(--surface-subtle)] p-3 text-sm text-[var(--muted)]">
            {context.email}
          </p>
          <form action={signOut} className="mt-6">
            <Button
              type="submit"
              className="bg-transparent text-[var(--navy)] shadow-none ring-1 ring-[var(--border)] hover:bg-[var(--surface-subtle)]"
            >
              Use a different Google account
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
