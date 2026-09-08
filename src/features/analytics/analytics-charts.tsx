"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type AnalyticsPoint = {
  week: string;
  onTime: number;
  late: number;
  missing: number;
  estimatedGpa: number | null;
};

export function AnalyticsCharts({ data }: { data: AnalyticsPoint[] }) {
  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <figure>
        <figcaption className="mb-4 font-bold text-[var(--navy)]">
          Check-in rate (%)
        </figcaption>
        <div className="h-72" aria-label="Weekly submission rate chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="onTime" name="On time" stackId="a" fill="#16745a" />
              <Bar dataKey="late" name="Late" stackId="a" fill="#d7a72f" />
              <Bar
                dataKey="missing"
                name="Missing"
                stackId="a"
                fill="#a63838"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </figure>
      <figure>
        <figcaption className="mb-4 font-bold text-[var(--navy)]">
          Estimated chapter GPA trend
        </figcaption>
        <div className="h-72" aria-label="Estimated chapter GPA trend chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" />
              <YAxis domain={[0, 4]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="estimatedGpa"
                name="Estimated GPA"
                stroke="#11294b"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  );
}
