import Link from "next/link";
import { notFound } from "next/navigation";
import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AccessManagement } from "@/features/administration/access-management";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

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
  const context = await requireChairContext();
  const { section } = await params;
  const query = await searchParams;
  const content = sections[section as keyof typeof sections];
  if (!content) notFound();
  const supabase = await createClient();
  const { data: auditRows, error: auditError } =
    section === "audit"
      ? await supabase
          .from("audit_log")
          .select(
            "id, action, entity_type, entity_id, reason, created_at, profiles(display_name, email)",
          )
          .eq("chapter_id", context.chapterId!)
          .order("created_at", { ascending: false })
          .limit(250)
      : { data: [], error: null };
  if (auditError) throw new Error("Could not load the audit log.");
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
      ) : section === "audit" ? (
        <Card>
          <div className="divide-y">
            {(auditRows ?? []).map((row) => {
              const actor = row.profiles as unknown as {
                display_name: string | null;
                email: string;
              } | null;
              return (
                <article key={row.id} className="p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-bold text-[var(--navy)]">
                        {row.action.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {row.entity_type.replaceAll("_", " ")} · {row.entity_id}
                      </p>
                      {row.reason && (
                        <p className="mt-2 text-sm">{row.reason}</p>
                      )}
                    </div>
                    <div className="sm:text-right">
                      <Badge>{actor?.display_name || "System"}</Badge>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(row.created_at))}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
            {!auditRows?.length && (
              <p className="p-8 text-center text-[var(--muted)]">
                No audit events are available.
              </p>
            )}
          </div>
        </Card>
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
