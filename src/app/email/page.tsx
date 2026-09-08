import Link from "next/link";
import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getMemberDirectory } from "@/features/members/queries";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{ prepare?: string }>;
}) {
  const query = await searchParams;
  const context = await requireChairContext();
  const { members, period } = await getMemberDirectory({ filter: "active" });
  const supabase = await createClient();
  const [
    { data: batches, error: batchError },
    { data: messages, error: messageError },
  ] = await Promise.all([
    supabase
      .from("email_batches")
      .select(
        "id, week_id, batch_type, state, approved_at, created_at, idempotency_key",
      )
      .eq("chapter_id", context.chapterId!)
      .order("created_at", { ascending: false }),
    supabase
      .from("email_messages")
      .select("id, batch_id, state, selected")
      .eq("chapter_id", context.chapterId!),
  ]);
  if (batchError || messageError) {
    throw new Error("Could not load the email center.");
  }

  const missingMembers = members.filter(
    (member) => member.submissionStatus === "missing",
  );
  const countsForBatch = (batchId: string) => {
    const rows = (messages ?? []).filter(
      (message) => message.batch_id === batchId,
    );
    return {
      total: rows.length,
      selected: rows.filter((message) => message.selected).length,
      delivered: rows.filter((message) => message.state === "delivered").length,
      failed: rows.filter((message) =>
        ["failed", "bounced"].includes(message.state),
      ).length,
    };
  };

  return (
    <ChairAppShell>
      <PageHeading
        eyebrow="Review before sending"
        title="Email center"
        description="Stored batches and delivery states from Supabase. No message is sent merely by opening or preparing this page."
      />

      {query.prepare === "missing" && (
        <Card className="mb-5">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[var(--navy)]">
                  Missing-grade email preparation
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {period?.currentWeek
                    ? period.semester.name + " · " + period.currentWeek.label
                    : "No current academic week"}
                </p>
              </div>
              <Badge tone={missingMembers.length ? "warning" : "success"}>
                {missingMembers.length} missing
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {missingMembers.length ? (
              <>
                <p className="text-sm text-[var(--muted)]">
                  These active members currently have no submission. This
                  preview has not created or sent any email.
                </p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {missingMembers.map((member) => (
                    <li key={member.id} className="rounded-xl border p-3">
                      <Link
                        href={("/members/" + member.id) as never}
                        className="font-semibold text-[var(--navy)] hover:underline"
                      >
                        {member.name}
                      </Link>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {member.connected
                          ? "Google account connected"
                          : "No connected account; no recipient email available"}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 rounded-xl bg-[var(--surface-subtle)] p-3 text-sm text-[var(--muted)]">
                  Persistent batch creation and explicit approval/send controls
                  remain disabled until that audited workflow is completed.
                </p>
              </>
            ) : (
              <p className="text-[var(--muted)]">
                No active members are missing this week’s check-in.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Stored email batches
          </h2>
        </CardHeader>
        <div className="divide-y">
          {(batches ?? []).map((batch) => {
            const counts = countsForBatch(batch.id);
            return (
              <article
                key={batch.id}
                className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-bold text-[var(--navy)]">
                    {batch.batch_type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Created{" "}
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(batch.created_at))}{" "}
                    · {counts.selected} selected of {counts.total}
                  </p>
                  {(counts.delivered > 0 || counts.failed > 0) && (
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {counts.delivered} delivered · {counts.failed} failed or
                      bounced
                    </p>
                  )}
                </div>
                <Badge
                  tone={
                    batch.state === "completed"
                      ? "success"
                      : batch.state === "partial_failure"
                        ? "danger"
                        : batch.state === "sending"
                          ? "warning"
                          : "neutral"
                  }
                >
                  {batch.state.replaceAll("_", " ")}
                </Badge>
              </article>
            );
          })}
          {!batches?.length && (
            <p className="p-8 text-center text-[var(--muted)]">
              No email batches have been created.
            </p>
          )}
        </div>
      </Card>
    </ChairAppShell>
  );
}
