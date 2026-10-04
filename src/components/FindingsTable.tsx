"use client";

import type { Finding } from "@/types";
import FindingSeverityBadge from "./FindingSeverityBadge";

export default function FindingsTable({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-green-800 font-medium">No issues found</p>
        <p className="text-green-600 text-sm mt-1">
          The static analysis did not detect any issues in the submitted code.
        </p>
      </div>
    );
  }

  const sorted = [...findings].sort((a, b) => b.severity - a.severity);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Severity
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rule
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Message
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Line
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sorted.map((finding) => (
            <tr
              key={finding.id}
              className={
                finding.severity === 2 ? "bg-red-50/50" : "bg-yellow-50/30"
              }
            >
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
        </tbody>
      </table>
    </div>
  );
}
