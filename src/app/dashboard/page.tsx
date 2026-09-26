"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import SubmissionCard from "@/components/SubmissionCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";
import type { SubmissionWithCount } from "@/types";

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<SubmissionWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/submissions", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setSubmissions(data.submissions ?? []))
      .finally(() => setLoading(false));
  }, []);

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
          <div className="space-y-3">
            {submissions.map((s) => (
              <SubmissionCard key={s.id} submission={s} />
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
