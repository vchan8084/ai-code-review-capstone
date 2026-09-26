"use client";

import Link from "next/link";
import type { SubmissionWithCount } from "@/types";

export default function SubmissionCard({
  submission,
}: {
  submission: SubmissionWithCount;
}) {
  const date = new Date(submission.created_at + "Z");
  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    analyzing: "bg-blue-100 text-blue-800",
    pending: "bg-gray-100 text-gray-800",
    error: "bg-red-100 text-red-800",
  };

  return (
    <Link href={`/submissions/${submission.id}`}>
      <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
        <div className="flex items-center justify-between mb-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[submission.status] ?? statusColors.pending}`}
          >
            {submission.status}
          </span>
          <span className="text-xs text-gray-500">
            {date.toLocaleDateString()} {date.toLocaleTimeString()}
          </span>
        </div>
        <pre className="text-xs text-gray-600 font-mono truncate mb-3 bg-gray-50 rounded p-2">
          {submission.code.slice(0, 120)}
          {submission.code.length > 120 ? "..." : ""}
        </pre>
        <div className="flex gap-3 text-xs">
          {submission.error_count > 0 && (
            <span className="text-red-600 font-medium">
              {submission.error_count} error{submission.error_count !== 1 ? "s" : ""}
            </span>
          )}
          {submission.warning_count > 0 && (
            <span className="text-yellow-600 font-medium">
              {submission.warning_count} warning{submission.warning_count !== 1 ? "s" : ""}
            </span>
          )}
          {submission.finding_count === 0 && (
            <span className="text-green-600 font-medium">No issues</span>
          )}
        </div>
      </div>
    </Link>
  );
}
