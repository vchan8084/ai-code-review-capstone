"use client";

import type { RiskSummary as RiskSummaryType } from "@/types";

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "#DC262615", text: "#DC2626", border: "#DC262630" },
  high: { bg: "#EA580C15", text: "#EA580C", border: "#EA580C30" },
  medium: { bg: "#D9770615", text: "#D97706", border: "#D9770630" },
  low: { bg: "#16A34A15", text: "#16A34A", border: "#16A34A30" },
  none: { bg: "#16A34A15", text: "#16A34A", border: "#16A34A30" },
};

export default function RiskSummary({
  summary,
}: {
  summary: RiskSummaryType;
}) {
  const riskStyle = RISK_COLORS[summary.overall_risk] ?? RISK_COLORS.none;

  return (
    <div className="space-y-3">
      <div
        className="rounded-lg border px-4 py-3"
        style={{ backgroundColor: riskStyle.bg, borderColor: riskStyle.border }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: riskStyle.text }}>
            Overall Risk: {summary.overall_risk.toUpperCase()}
          </span>
          <span className="text-sm text-gray-500">
            {summary.total_findings} finding{summary.total_findings !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(["critical", "high", "medium", "low"] as const).map((level) => {
          const count = summary[`${level}_count`];
          const style = RISK_COLORS[level];
          return (
            <div
              key={level}
              className="rounded-lg border px-3 py-2 text-center"
              style={{ backgroundColor: style.bg, borderColor: style.border }}
            >
              <div className="text-lg font-bold" style={{ color: style.text }}>{count}</div>
              <div className="text-xs text-gray-500 capitalize">{level}</div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 text-xs text-gray-500">
        <span>ESLint: {summary.eslint_count}</span>
        <span>AI: {summary.llm_count}</span>
        {summary.deduplicated_count > 0 && (
          <span>Deduplicated: {summary.deduplicated_count}</span>
        )}
      </div>
    </div>
  );
}
