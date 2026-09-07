import Link from "next/link";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const members = [
  {
    name: "Alex Morgan",
    gpa: "3.62",
    submission: "On time",
    hours: "1 / 1",
    alert: false,
  },
  {
    name: "Cameron Lee",
    gpa: "2.84",
    submission: "Missing",
    hours: "1 / 2",
    alert: true,
  },
  {
    name: "Taylor Brooks",
    gpa: "3.18",
    submission: "Late",
    hours: "1 / 1",
    alert: false,
  },
  {
    name: "Riley Bennett",
    gpa: "2.31",
    submission: "On time",
    hours: "0 / 4",
    alert: true,
  },
] as const;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { filter, q = "" } = await searchParams;
  const shown = members.filter(
    (member) =>
      member.name.toLowerCase().includes(q.toLowerCase()) &&
      (filter !== "alerts" || member.alert),
  );
  return (
    <AppShell>
      <DemoBanner />
      <PageHeading
        eyebrow="Roster"
        title="Members"
        description="Find active and historical members, then open a profile for secure academic review."
      />
      <Card>
        <CardContent>
          <form className="mb-5 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search members</span>
              <Search className="pointer-events-none absolute top-3.5 left-3 size-5 text-[var(--muted)]" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search members"
                className="min-h-12 w-full rounded-xl border bg-white pr-4 pl-10"
              />
            </label>
            <select
              name="filter"
              defaultValue={filter ?? "all"}
              aria-label="Filter members"
              className="min-h-12 rounded-xl border bg-white px-4"
            >
              <option value="all">All active members</option>
              <option value="alerts">Academic alerts</option>
              <option value="missing">Missing check-in</option>
            </select>
            <button className="min-h-12 rounded-xl bg-[var(--navy)] px-5 font-semibold text-white">
              Apply
            </button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left">
              <thead>
                <tr className="border-b text-sm text-[var(--muted)]">
                  <th className="pb-3 font-semibold">Member</th>
                  <th className="pb-3 font-semibold">
                    Estimated Fall 2026 GPA
                  </th>
                  <th className="pb-3 font-semibold">Check-in</th>
                  <th className="pb-3 font-semibold">Study hours</th>
                  <th className="pb-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((member) => (
                  <tr key={member.name} className="border-b last:border-0">
                    <td className="py-4 font-bold text-[var(--navy)]">
                      {member.name}
                      {member.alert && (
                        <Badge tone="warning" className="ml-2">
                          Review
                        </Badge>
                      )}
                    </td>
                    <td className="py-4">{member.gpa}</td>
                    <td className="py-4">
                      <Badge
                        tone={
                          member.submission === "On time"
                            ? "success"
                            : member.submission === "Late"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {member.submission}
                      </Badge>
                    </td>
                    <td className="py-4">{member.hours} hours</td>
                    <td className="py-4 text-right">
                      <Link
                        href="/members/demo-member"
                        className="font-semibold text-[var(--navy)] underline-offset-4 hover:underline"
                      >
                        View profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && (
              <p className="py-10 text-center text-[var(--muted)]">
                No members match this filter.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
