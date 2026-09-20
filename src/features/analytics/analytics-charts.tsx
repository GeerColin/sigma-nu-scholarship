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
  awaiting: number;
  missing: number;
  onTimeCount: number;
  lateCount: number;
  awaitingCount: number;
  missingCount: number;
  expectedCount: number;
  excludedReason: "pre_start" | "skipped" | "future" | null;
  estimatedGpa: number | null;
};

function StatusTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    value?: number;
    color?: string;
    payload?: AnalyticsPoint;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  if (point.excludedReason) {
    return (
      <div className="rounded-lg border bg-white p-3 text-sm shadow-lg">
        <p className="font-bold text-[var(--navy)]">{label}</p>
        <p className="mt-1 text-[var(--muted)]">
          {point.excludedReason === "pre_start"
            ? "Before first grade-check week"
            : point.excludedReason === "skipped"
              ? "No grade check required this week"
              : "Future week"}
        </p>
      </div>
    );
  }
  const rows = [
    ["On time", point.onTimeCount, "#16745a"],
    ["Late", point.lateCount, "#d7a72f"],
    ["Awaiting", point.awaitingCount, "#64748b"],
    ["Missing", point.missingCount, "#a63838"],
  ] as const;
  return (
    <div className="rounded-lg border bg-white p-3 text-sm shadow-lg">
      <p className="font-bold text-[var(--navy)]">{label}</p>
      <p className="mt-1 text-[var(--muted)]">
        Expected: {point.expectedCount} members
      </p>
      {rows.map(([name, count, color]) => (
        <p key={name} style={{ color }}>
          {name}: {count}
        </p>
      ))}
    </div>
  );
}

export function AnalyticsCharts({ data }: { data: AnalyticsPoint[] }) {
  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <figure>
        <figcaption className="mb-4 font-bold text-[var(--navy)]">
          Weekly check-in status (%) · counts in tooltip
        </figcaption>
        <div className="h-64 sm:h-72" aria-label="Weekly submission rate chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} minTickGap={16} />
              <YAxis domain={[0, 100]} />
              <Tooltip content={<StatusTooltip />} />
              <Legend />
              <Bar dataKey="onTime" name="On Time" stackId="a" fill="#16745a" />
              <Bar dataKey="late" name="Late" stackId="a" fill="#d7a72f" />
              <Bar
                dataKey="awaiting"
                name="Awaiting"
                stackId="a"
                fill="#64748b"
              />
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
          Estimated Semester GPA
        </figcaption>
        <div
          className="h-64 sm:h-72"
          aria-label="Estimated Semester GPA trend chart"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} minTickGap={16} />
              <YAxis domain={[0, 4]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="estimatedGpa"
                name="Estimated Semester GPA"
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
