import Link from "next/link";
import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export default async function AdministrationPage() {
  const context = await requireChairContext();
  const supabase = await createClient();
  const [
    { count: pendingCount, error: requestError },
    { data: roles, error: roleError },
    { count: auditCount, error: auditError },
  ] = await Promise.all([
    supabase
      .from("access_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("member_roles")
      .select("role")
      .eq("chapter_id", context.chapterId!)
      .eq("active", true)
      .in("role", ["proctor", "admin"]),
    supabase
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("chapter_id", context.chapterId!),
  ]);
  if (requestError || roleError || auditError) {
    throw new Error("Could not load administration status.");
  }
  const proctorCount = (roles ?? []).filter(
    (role) => role.role === "proctor",
  ).length;
  const adminCount = (roles ?? []).filter(
    (role) => role.role === "admin",
  ).length;
  const cards = [
    {
      title: "Setup checklist",
      detail: "Review chapter configuration readiness",
      href: "/setup",
      ready: true,
    },
    {
      title: "CSV roster import",
      detail: "Validated preview with duplicate protection",
      href: "/administration/import",
      ready: true,
    },
    {
      title: "Account requests",
      detail: (pendingCount ?? 0) + " awaiting review",
      href: "/administration/access",
      ready: true,
    },
    {
      title: "Roles and proctors",
      detail: proctorCount + " proctors · " + adminCount + " admins",
      href: "/administration/roles",
      ready: true,
    },
    {
      title: "Semester export",
      detail: "Download a structured CSV and JSON archive",
      href: "/administration/export",
      ready: true,
    },
    {
      title: "Audit log",
      detail: (auditCount ?? 0) + " append-only events",
      href: "/administration/audit",
      ready: true,
    },
    {
      title: "Scholarship Chair handoff",
      detail: "Readiness checks and atomic role transfer",
      href: "/administration/handoff",
      ready: true,
    },
  ] as const;

  return (
    <ChairAppShell>
      <PageHeading
        eyebrow="Governance"
        title="Administration"
        description="Manage account access and review the implementation status of protected governance workflows."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href as never}
            className="rounded-[var(--radius)] focus-visible:outline"
          >
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-[var(--navy)]">{card.title}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {card.detail}
                    </p>
                  </div>
                  <Badge tone={card.ready ? "success" : "neutral"}>
                    {card.ready ? "Available" : "Upcoming"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </ChairAppShell>
  );
}
