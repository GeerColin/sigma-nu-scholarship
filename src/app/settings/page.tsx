import { AppShell } from "@/components/app-shell";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  const items = [
    ["Semester", "Fall 2026 · Aug. 17–Dec. 11", "Configured"],
    ["Weekly deadline", "Friday · 11:59 PM · America/New_York", "Configured"],
    ["GPA weighting", "Credit-hour weighted", "Default"],
    [
      "Grade-change alert",
      "10 percentage points · 1 letter step",
      "Configured",
    ],
    ["Study-hour rules", "Version 1 · maximum 5 hours", "Active"],
    ["Email delivery", "Development safe mode", "Safe mode"],
  ];
  return (
    <AppShell>
      <DemoBanner />
      <PageHeading
        eyebrow="Chapter policy"
        title="Settings"
        description="Configuration is managed here and versioned where changes could affect historical calculations."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(([title, value, status]) => (
          <Card key={title}>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-[var(--navy)]">{title}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{value}</p>
                </div>
                <Badge tone="success">{status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
