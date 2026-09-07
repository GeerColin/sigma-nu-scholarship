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

const data = [
  { week: "W1", onTime: 88, late: 6, missing: 6, estimatedGpa: 3.02 },
  { week: "W2", onTime: 84, late: 8, missing: 8, estimatedGpa: 3.08 },
  { week: "W3", onTime: 90, late: 4, missing: 6, estimatedGpa: 3.11 },
  { week: "W4", onTime: 86, late: 8, missing: 6, estimatedGpa: 3.06 },
  { week: "W5", onTime: 84, late: 6, missing: 10, estimatedGpa: 3.12 },
];

export function AnalyticsCharts() {
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
              <YAxis domain={[2.5, 3.5]} />
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
