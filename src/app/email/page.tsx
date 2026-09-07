import { AppShell } from "@/components/app-shell";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{ prepare?: string }>;
}) {
  const { prepare } = await searchParams;
  return (
    <AppShell>
      <DemoBanner />
      <PageHeading
        eyebrow="Review before sending"
        title="Email center"
        description="Prepared messages remain drafts until an authorized administrator reviews and approves them."
      />
      {prepare === "missing" && (
        <div
          role="status"
          className="mb-5 rounded-xl bg-[var(--success-soft)] p-4 font-semibold text-[var(--success)]"
        >
          A draft batch for 5 missing check-ins is ready for review. No email
          has been sent.
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          [
            "Weekly check-in reminders",
            "5 recipients",
            "Ready to review",
            "danger",
          ],
          [
            "Study-hour assignments",
            "14 recipients",
            "Ready to review",
            "warning",
          ],
          [
            "Delivery history",
            "48 messages",
            "46 delivered · 2 failed",
            "neutral",
          ],
        ].map(([title, count, status, tone]) => (
          <Card key={title}>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[var(--navy)]">
                    {title}
                  </h2>
                  <p className="mt-1 text-[var(--muted)]">{count}</p>
                </div>
                <Badge tone={tone as "danger" | "warning" | "neutral"}>
                  {status}
                </Badge>
              </div>
              <p className="mt-5 text-sm text-[var(--muted)]">
                Open the configured Supabase environment to edit, preview,
                approve, and send this batch with idempotency protection.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
