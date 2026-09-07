import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function AdministrationPage() {
  return (
    <AppShell>
      <DemoBanner />
      <PageHeading
        eyebrow="Governance"
        title="Administration"
        description="Manage access, roles, exports, audit history, and the protected Scholarship Chair handoff."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {(
          [
            ["Account requests", "3 awaiting review", "/administration/access"],
            [
              "Roles and proctors",
              "5 proctors · 2 admins",
              "/administration/roles",
            ],
            [
              "Semester export",
              "Structured CSV files + manifest",
              "/administration/export",
            ],
            [
              "Audit log",
              "Append-only security history",
              "/administration/audit",
            ],
            [
              "Scholarship Chair handoff",
              "Readiness checks and atomic transfer",
              "/administration/handoff",
            ],
          ] as const
        ).map(([title, detail, href]) => (
          <Link
            key={title}
            href={href}
            className="rounded-[var(--radius)] focus-visible:outline"
          >
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-[var(--navy)]">{title}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{detail}</p>
                  </div>
                  <Badge>Open</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
