import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent } from "@/components/ui/card";

const sections = {
  access: [
    "Account requests",
    "Review authenticated identities and link them to existing roster records without exposing the roster to applicants.",
  ],
  roles: [
    "Roles and proctors",
    "Manage chapter-scoped operational roles. Only the current Scholarship Chair can control Admin access.",
  ],
  export: [
    "Semester export",
    "Prepare members, courses, submissions, grade entries, assignments, sessions, email history, and appropriate audit records as structured CSV files.",
  ],
  audit: [
    "Audit log",
    "Review append-only records for approvals, role changes, revisions, overrides, corrections, policy changes, sends, and handoffs.",
  ],
  handoff: [
    "Scholarship Chair handoff",
    "Select an activated successor, run readiness checks, review outgoing access, and complete one atomic transfer.",
  ],
} as const;
export default async function AdministrationSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const content = sections[section as keyof typeof sections];
  if (!content) notFound();
  return (
    <AppShell>
      <DemoBanner />
      <PageHeading
        eyebrow="Administration"
        title={content[0]}
        description={content[1]}
        action={
          <Link
            href="/administration"
            className="font-semibold text-[var(--navy)] hover:underline"
          >
            Back
          </Link>
        }
      />
      <Card>
        <CardContent>
          <p className="font-semibold text-[var(--navy)]">
            Secure environment required
          </p>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            This development view intentionally does not mutate synthetic
            records. In a configured Supabase environment, the server action
            uses authenticated chapter roles, validated input, a transaction
            where needed, and an append-only audit event.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
