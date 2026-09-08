import Link from "next/link";
import { notFound } from "next/navigation";
import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { AccessManagement } from "@/features/administration/access-management";
import { requireChairContext } from "@/lib/auth/guards";

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
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  await requireChairContext();
  const { section } = await params;
  const query = await searchParams;
  const content = sections[section as keyof typeof sections];
  if (!content) notFound();
  return (
    <ChairAppShell>
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
      {section === "access" ? (
        <AccessManagement status={query.status} error={query.error} />
      ) : (
        <Card>
          <CardContent>
            <p className="font-semibold text-[var(--navy)]">
              This workflow is not implemented yet
            </p>
            <p className="mt-2 max-w-2xl text-[var(--muted)]">
              No chapter records can be changed from this page yet. The page is
              protected by authenticated chapter-role checks while its complete
              audited workflow is built.
            </p>
          </CardContent>
        </Card>
      )}
    </ChairAppShell>
  );
}
