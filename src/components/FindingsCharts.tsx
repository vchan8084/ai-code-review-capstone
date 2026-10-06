"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { Finding } from "@/types";

const RISK_COLORS: Record<string, string> = {
  critical: "#DC2626",
  high: "#EA580C",
  medium: "#D97706",
  low: "#16A34A",
};

const SOURCE_COLORS: Record<string, string> = {
  eslint: "#6B7280",
  llm: "#6366F1",
};

interface Props {
  findings: Finding[];
}

export default function FindingsCharts({ findings }: Props) {
  if (findings.length === 0) return null;

  const severityData = (["critical", "high", "medium", "low"] as const).map(
    (level) => ({
      name: level.charAt(0).toUpperCase() + level.slice(1),
      count: findings.filter((f) => (f.risk_level ?? "low") === level).length,
      key: level,
    })
  );

  const sourceData = [
    {
      name: "ESLint",
      count: findings.filter((f) => f.source === "eslint").length,
      key: "eslint",
    },
    {
      name: "AI",
      count: findings.filter((f) => f.source === "llm").length,
      key: "llm",
    },
  ];

  const maxSeverity = Math.max(...severityData.map((d) => d.count), 1);
  const maxSource = Math.max(...sourceData.map((d) => d.count), 1);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Findings by Risk Level
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            data={severityData}
            layout="vertical"
            margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
            barSize={18}
          >
            <XAxis
              type="number"
              domain={[0, maxSeverity]}
              hide
            />
            <YAxis
              type="category"
              dataKey="name"
              width={60}
              tick={{ fontSize: 12, fill: "#52514e" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={false}
              contentStyle={{
                fontSize: 12,
                border: "1px solid #e1e0d9",
                borderRadius: 6,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
              formatter={(value) => [value, "Findings"]}
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              label={{
                position: "right",
                fontSize: 12,
                fill: "#52514e",
                formatter: (v) => (Number(v) > 0 ? v : ""),
              }}
            >
              {severityData.map((d) => (
                <Cell key={d.key} fill={RISK_COLORS[d.key]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Findings by Source
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            data={sourceData}
            layout="vertical"
            margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
            barSize={18}
          >
            <XAxis
              type="number"
              domain={[0, maxSource]}
              hide
            />
            <YAxis
              type="category"
              dataKey="name"
              width={50}
              tick={{ fontSize: 12, fill: "#52514e" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={false}
              contentStyle={{
                fontSize: 12,
                border: "1px solid #e1e0d9",
                borderRadius: 6,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
              formatter={(value) => [value, "Findings"]}
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              label={{
                position: "right",
                fontSize: 12,
                fill: "#52514e",
                formatter: (v) => (Number(v) > 0 ? v : ""),
              }}
            >
              {sourceData.map((d) => (
                <Cell key={d.key} fill={SOURCE_COLORS[d.key]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
