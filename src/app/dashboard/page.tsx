"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import SubmissionCard from "@/components/SubmissionCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";
import type { SubmissionWithCount } from "@/types";

const PAGE_SIZE = 5;

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<SubmissionWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/submissions", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setSubmissions(data.submissions ?? []))
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(submissions.length / PAGE_SIZE));
  const paginated = submissions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Submissions</h1>
          <Link
            href="/submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Submission
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : submissions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 mb-4">No submissions yet</p>
            <Link
              href="/submit"
              className="text-blue-600 hover:underline text-sm"
            >
              Submit your first code for review
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginated.map((s) => (
                <SubmissionCard key={s.id} submission={s} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                      page === i + 1
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}

            <p className="text-center text-xs text-gray-400 mt-2">
              {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
            </p>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
