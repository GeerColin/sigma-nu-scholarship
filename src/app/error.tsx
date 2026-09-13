"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center p-4 sm:p-7">
      <Card className="w-full">
        <CardContent>
          <p className="text-sm font-bold tracking-[0.14em] text-[var(--danger)] uppercase">
            Page unavailable
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--navy)]">
            We couldn’t load this page
          </h1>
          <p className="mt-3 text-[var(--muted)]">
            Try loading the page again, or return to your dashboard. If you were
            saving a change, check its status before submitting it again.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={retry}>
              Try again
            </Button>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border px-4 font-semibold text-[var(--navy)]"
            >
              Return to dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
