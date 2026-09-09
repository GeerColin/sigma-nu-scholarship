import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  approveEmailBatch,
  editEmailBatch,
  editEmailMessage,
  prepareEmailBatch,
  sendApprovedEmailBatch,
} from "@/features/email/actions";
import { getMemberDirectory } from "@/features/members/queries";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const statusMessages: Record<string, string> = {
  prepared: "The email batch was prepared as a draft. Nothing was sent.",
  "batch-edited": "The entire draft batch was updated and audited.",
  "message-edited": "The selected member email was updated and audited.",
  approved: "The batch was approved. It has not been sent yet.",
  sent: "The approved batch was processed by the configured email transport.",
};

const batchLabels: Record<string, string> = {
  missing_grade_reminder: "Missing-grade reminders",
  study_hour_assignment: "Study-hour assignments",
  academic_alert: "Chair academic alerts",
};

const batchTemplates: Record<string, { subject: string; body: string }> = {
  missing_grade_reminder: {
    subject: "{{semesterName}} {{weekLabel}} grade reminder",
    body: "Hello {{memberName}},\n\nYour weekly scholarship check-in for {{weekLabel}} is missing. Please submit it even if the {{deadline}} deadline has passed. Detailed grades are not included in this reminder.",
  },
  study_hour_assignment: {
    subject: "{{weekLabel}} study-hour assignment",
    body: "Hello {{memberName}},\n\nYour {{weekLabel}} study-hour requirement is {{requiredHours}} hours. Completed: {{completedHours}} hours. Remaining: {{remainingHours}} hours.",
  },
  academic_alert: {
    subject: "Academic alert requires review",
    body: "An academic alert for {{memberName}} in {{weekLabel}} requires review in the secure scholarship dashboard. Detailed grades are intentionally omitted from this email.",
  },
};

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    error?: string;
    batch?: string;
  }>;
}) {
  const query = await searchParams;
  const context = await requireChairContext();
  const { members, period } = await getMemberDirectory({ filter: "active" });
  const supabase = await createClient();
  const [
    { data: batches, error: batchError },
    { data: messages, error: messageError },
    { count: openAlerts, error: alertError },
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
      .select(
        "id, batch_id, recipient_email, recipient_name, final_subject, final_body, state, selected, template_context",
      )
      .eq("chapter_id", context.chapterId!)
      .order("created_at"),
    period?.currentWeek
      ? supabase
          .from("academic_alerts")
          .select("id, grade_submissions!inner(week_id)", {
            count: "exact",
            head: true,
          })
          .eq("chapter_id", context.chapterId!)
          .eq("grade_submissions.week_id", period.currentWeek.id)
          .is("acknowledged_at", null)
      : Promise.resolve({ count: 0, error: null }),
  ]);
  if (batchError || messageError || alertError) {
    throw new Error("Could not load the email center.");
  }

  const missingMembers = members.filter(
    (member) =>
      member.submissionStatus === "missing" && member.notificationEmail,
  );
  const assignmentMembers = members.filter(
    (member) => member.requiredMinutes !== null && member.notificationEmail,
  );
  const rowsForBatch = (batchId: string) =>
    (messages ?? []).filter((message) => message.batch_id === batchId);

  return (
    <ChairAppShell>
      <PageHeading
        eyebrow="Review before sending"
        title="Email center"
        description="Prepare, personalize, approve, and send persistent batches. Preparation and approval never send automatically."
      />

      {query.status && statusMessages[query.status] && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-[var(--success-soft)] p-4 font-semibold text-[var(--success)]"
        >
          {statusMessages[query.status]}
        </p>
      )}
      {query.error && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-[var(--danger-soft)] p-4 font-semibold text-[var(--danger)]"
        >
          We couldn’t complete that email action. Nothing was sent. Confirm that
          the batch has eligible recipients and is in the expected state.
        </p>
      )}

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        {(
          [
            [
              "missing_grade_reminder",
              "Missing-grade reminders",
              missingMembers.length,
              "member currently missing a check-in",
              "members currently missing a check-in",
            ],
            [
              "study_hour_assignment",
              "Study-hour assignments",
              assignmentMembers.length,
              "member with a calculated assignment",
              "members with a calculated assignment",
            ],
            [
              "academic_alert",
              "Chair academic alerts",
              openAlerts ?? 0,
              "open alert for the current week",
              "open alerts for the current week",
            ],
          ] as const
        ).map(([batchType, title, count, singularDetail, pluralDetail]) => (
          <Card key={batchType}>
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-[var(--navy)]">{title}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {count} {count === 1 ? singularDetail : pluralDetail}
                  </p>
                </div>
                <Badge tone={count ? "warning" : "neutral"}>{count}</Badge>
              </div>
              {period?.currentWeek && (
                <form action={prepareEmailBatch} className="mt-4">
                  <input
                    type="hidden"
                    name="weekId"
                    value={period.currentWeek.id}
                  />
                  <input type="hidden" name="batchType" value={batchType} />
                  <Button type="submit" disabled={!count} className="w-full">
                    Prepare draft batch
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Stored email batches
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            All recipient content and delivery states below come from Supabase.
          </p>
        </CardHeader>
        <div className="divide-y">
          {(batches ?? []).map((batch) => {
            const rows = rowsForBatch(batch.id);
            const template =
              batchTemplates[batch.batch_type] ??
              batchTemplates.academic_alert!;
            const selected = rows.filter((message) => message.selected).length;
            const sent = rows.filter((message) =>
              ["sent", "delivered"].includes(message.state),
            ).length;
            const failed = rows.filter((message) =>
              ["failed", "bounced"].includes(message.state),
            ).length;
            return (
              <article
                key={batch.id}
                className={
                  "p-5 " +
                  (query.batch === batch.id ? "bg-[var(--surface-subtle)]" : "")
                }
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-bold text-[var(--navy)]">
                      {batchLabels[batch.batch_type] ??
                        batch.batch_type.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {selected} selected of {rows.length} · {sent} sent ·{" "}
                      {failed} failed
                    </p>
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
                </div>

                {batch.state === "draft" && (
                  <form
                    action={editEmailBatch}
                    className="mt-5 grid gap-3 rounded-xl border p-4"
                  >
                    <input type="hidden" name="batchId" value={batch.id} />
                    <p className="font-semibold text-[var(--navy)]">
                      Edit entire batch
                    </p>
                    <label>
                      <span className="mb-1 block text-sm font-semibold">
                        Subject template
                      </span>
                      <input
                        name="subject"
                        required
                        maxLength={200}
                        defaultValue={template.subject}
                        className="min-h-11 w-full rounded-xl border px-3"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-sm font-semibold">
                        Body template
                      </span>
                      <textarea
                        name="body"
                        required
                        maxLength={20000}
                        rows={5}
                        defaultValue={template.body}
                        className="w-full rounded-xl border p-3"
                      />
                    </label>
                    <p className="text-xs text-[var(--muted)]">
                      Supported variables include memberName, semesterName,
                      weekLabel, deadline, requiredHours, completedHours, and
                      remainingHours when available for this batch type.
                    </p>
                    <Button type="submit" className="w-fit">
                      Apply to every message
                    </Button>
                  </form>
                )}

                <details className="mt-4 rounded-xl border">
                  <summary className="cursor-pointer p-4 font-semibold text-[var(--navy)]">
                    Preview and edit {rows.length} recipient
                    {rows.length === 1 ? "" : "s"}
                  </summary>
                  <div className="divide-y border-t">
                    {rows.map((message) => (
                      <form
                        key={message.id}
                        action={editEmailMessage}
                        className="space-y-3 p-4"
                      >
                        <input
                          type="hidden"
                          name="messageId"
                          value={message.id}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[var(--navy)]">
                              {message.recipient_name || "Recipient"}
                            </p>
                            <p className="text-sm text-[var(--muted)]">
                              {message.recipient_email}
                            </p>
                          </div>
                          <Badge>{message.state}</Badge>
                        </div>
                        <label className="flex items-center gap-2 text-sm font-semibold">
                          <input
                            type="checkbox"
                            name="selected"
                            defaultChecked={message.selected}
                            disabled={batch.state !== "draft"}
                          />
                          Include in this batch
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-sm font-semibold">
                            Final subject
                          </span>
                          <input
                            name="subject"
                            required
                            maxLength={200}
                            defaultValue={message.final_subject}
                            readOnly={batch.state !== "draft"}
                            className="min-h-11 w-full rounded-xl border px-3 read-only:bg-[var(--surface-subtle)]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-sm font-semibold">
                            Final body
                          </span>
                          <textarea
                            name="body"
                            required
                            maxLength={20000}
                            rows={5}
                            defaultValue={message.final_body}
                            readOnly={batch.state !== "draft"}
                            className="w-full rounded-xl border p-3 read-only:bg-[var(--surface-subtle)]"
                          />
                        </label>
                        {batch.state === "draft" && (
                          <Button type="submit">Save this recipient</Button>
                        )}
                      </form>
                    ))}
                  </div>
                </details>

                {batch.state === "draft" && (
                  <form action={approveEmailBatch} className="mt-4">
                    <input type="hidden" name="batchId" value={batch.id} />
                    <Button type="submit">Approve selected messages</Button>
                  </form>
                )}
                {batch.state === "approved" && (
                  <form action={sendApprovedEmailBatch} className="mt-4">
                    <input type="hidden" name="batchId" value={batch.id} />
                    <Button type="submit">Send approved batch</Button>
                  </form>
                )}
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
