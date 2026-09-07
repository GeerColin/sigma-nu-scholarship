import { AppShell } from "@/components/app-shell";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { AnalyticsCharts } from "@/features/analytics/analytics-charts";

export default function AnalyticsPage() {
  return (
    <AppShell>
      <DemoBanner />
      <PageHeading
        eyebrow="Fall 2026"
        title="Academic trends"
        description="Chapter-level patterns are available only to authorized administrators; members see only their own trends."
      />
      <Card>
        <CardContent>
          <AnalyticsCharts />
        </CardContent>
      </Card>
    </AppShell>
  );
}
