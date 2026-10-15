"use client";

import { useState, useMemo } from "react";
import type { Finding } from "@/types";
import FindingSeverityBadge, {
  RiskLevelBadge,
  SourceBadge,
} from "./FindingSeverityBadge";

type SortKey = "source" | "risk" | "severity" | "line";
type SortDir = "asc" | "desc";

const RISK_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

interface Props {
  findings: Finding[];
}

export default function FindingsTable({ findings }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("risk");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = findings;
    if (sourceFilter !== "all") {
      result = result.filter((f) => f.source === sourceFilter);
    }
    if (riskFilter !== "all") {
      result = result.filter((f) => (f.risk_level ?? "low") === riskFilter);
    }
    return result;
  }, [findings, sourceFilter, riskFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "source":
          cmp = a.source.localeCompare(b.source);
          break;
        case "risk":
          cmp =
            (RISK_ORDER[a.risk_level ?? "low"] ?? 3) -
            (RISK_ORDER[b.risk_level ?? "low"] ?? 3);
          break;
        case "severity":
          cmp = b.severity - a.severity;
          break;
        case "line":
          cmp = (a.line ?? 0) - (b.line ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  if (findings.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-green-800 font-medium">No issues found</p>
        <p className="text-green-600 text-sm mt-1">
          The analysis did not detect any issues in the submitted code.
        </p>
      </div>
    );
  }

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return <span className="text-gray-300 ml-1">&#8597;</span>;
    return (
      <span className="ml-1">
        {sortDir === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-3">
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          Source
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
          >
            <option value="all">All</option>
            <option value="eslint">ESLint</option>
            <option value="llm">AI</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          Risk
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        {(sourceFilter !== "all" || riskFilter !== "all") && (
          <span className="text-xs text-gray-500 self-center">
            {sorted.length} of {findings.length} findings
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader label="Source" sortKey="source" current={sortKey} dir={sortDir} onClick={toggleSort} indicator={sortIndicator} />
              <SortableHeader label="Risk" sortKey="risk" current={sortKey} dir={sortDir} onClick={toggleSort} indicator={sortIndicator} />
              <SortableHeader label="Severity" sortKey="severity" current={sortKey} dir={sortDir} onClick={toggleSort} indicator={sortIndicator} />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rule
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Message
              </th>
              <SortableHeader label="Line" sortKey="line" current={sortKey} dir={sortDir} onClick={toggleSort} indicator={sortIndicator} />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sorted.map((finding) => (
              <tr
                key={finding.id}
                className={
                  finding.risk_level === "critical"
                    ? "bg-purple-50/50"
                    : finding.severity === 2
                      ? "bg-red-50/50"
                      : "bg-yellow-50/30"
                }
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <SourceBadge source={finding.source} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <RiskLevelBadge level={finding.risk_level} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <FindingSeverityBadge severity={finding.severity} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-700">
                  {finding.rule_id ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {finding.message}
                  {finding.suggestion && (
                    <p className="text-xs text-gray-500 mt-1">
                      {finding.suggestion}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {finding.line ?? "—"}
                  {finding.column ? `:${finding.column}` : ""}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  No findings match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  current,
  dir,
  onClick,
  indicator,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
  indicator: (key: SortKey) => React.ReactNode;
}) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
      onClick={() => onClick(sortKey)}
      aria-sort={
        current === sortKey
          ? dir === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      {label}
      {indicator(sortKey)}
    </th>
  );
}
