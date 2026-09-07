import { AppShell } from "@/components/app-shell";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function StudyHoursPage() {
  const rows = [
    ["Alex Morgan", "1", "1", "Complete"],
    ["Cameron Lee", "2", "1", "In progress"],
    ["Riley Bennett", "4", "0", "Not started"],
    ["Taylor Brooks", "2", "2", "Complete"],
  ];
  return (
    <AppShell>
      <DemoBanner />
      <PageHeading
        eyebrow="Week 5"
        title="Study hours"
        description="Review final requirements and completion recorded by authorized proctors."
      />
      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-left">
              <thead>
                <tr className="border-b text-sm text-[var(--muted)]">
                  {[
                    "Member",
                    "Required",
                    "Completed",
                    "Remaining",
                    "Status",
                  ].map((h) => (
                    <th key={h} className="pb-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([name, required, completed, status]) => (
                  <tr key={name} className="border-b last:border-0">
                    <td className="py-4 font-bold text-[var(--navy)]">
                      {name}
                    </td>
                    <td>{required} hr</td>
                    <td>{completed} hr</td>
                    <td>{Number(required) - Number(completed)} hr</td>
                    <td>
                      <Badge
                        tone={
                          status === "Complete"
                            ? "success"
                            : status === "In progress"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
