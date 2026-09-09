import Link from "next/link";
import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireChairContext } from "@/lib/auth/guards";

const workflows = [
  {
    title: "Start a semester",
    href: "/settings",
    steps: [
      "Create the term with its timezone and weekly deadline.",
      "Review generated academic weeks and activate the term.",
      "Configure study-hour rules before publishing assignments.",
    ],
  },
  {
    title: "Bring in the roster",
    href: "/administration/import",
    steps: [
      "Use First Name and Last Name CSV headers; Status is optional.",
      "Review excluded blank, malformed, and duplicate rows.",
      "Confirm only after the Ready count matches your synthetic test file.",
    ],
  },
  {
    title: "Approve Google accounts",
    href: "/administration/access",
    steps: [
      "Compare the authenticated Google identity with the requested roster name.",
      "Link only to the matching unconnected roster record.",
      "Disconnecting an identity preserves all academic history.",
    ],
  },
  {
    title: "Run the weekly cycle",
    href: "/this-week",
    steps: [
      "Monitor on-time, late, and missing Member check-ins.",
      "Review academic alerts and publish study-hour assignments.",
      "Have Proctors log sessions; correct exceptions with an audit reason.",
    ],
  },
  {
    title: "Send reviewed email",
    href: "/email",
    steps: [
      "Prepare a persistent draft batch; preparation sends nothing.",
      "Review the exact subject, body, recipients, and selection state.",
      "Approve, then explicitly send. Retry only failed delivery records.",
    ],
  },
  {
    title: "Close or hand off",
    href: "/administration/handoff",
    steps: [
      "Download the semester ZIP and retain it according to chapter policy.",
      "Resolve pending access requests and failed email deliveries.",
      "Select an active connected successor and complete the atomic transfer.",
    ],
  },
] as const;

export default async function ChairGuidePage() {
  const context = await requireChairContext();
  return (
    <ChairAppShell>
      <PageHeading
        eyebrow="In-app operations manual"
        title="Scholarship Chair guide"
        description="A concise, security-aware sequence for setup, weekly operations, exports, and leadership continuity."
      />
      <p className="mb-5 rounded-xl bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted)]">
        Signed in as{" "}
        {context.roles.includes("scholarship_chair")
          ? "Scholarship Chair"
          : "Admin"}
        . Academic data stays inside protected pages; never place grades in
        email or shared CSV files outside the semester export workflow.
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        {workflows.map((workflow, index) => (
          <Card key={workflow.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[var(--navy)]">
                {workflow.title}
              </h2>
              <Badge>Step {index + 1}</Badge>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
                {workflow.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <Link
                href={workflow.href}
                className="mt-5 inline-flex min-h-11 items-center rounded-xl border px-4 font-semibold text-[var(--navy)] hover:bg-[var(--surface-subtle)]"
              >
                Open workflow
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </ChairAppShell>
  );
}
