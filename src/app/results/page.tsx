"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { EvaluationResult } from "@/types";

interface AggregateMetrics {
  precision: number;
  recall: number;
  f1_score: number;
}

interface LatencyData {
  eslint_avg_ms: number;
  llm_avg_ms: number;
  total_avg_ms: number;
  eslint_min_ms: number;
  eslint_max_ms: number;
  llm_min_ms: number;
  llm_max_ms: number;
}

interface EvalResponse {
  results: EvaluationResult[];
  aggregate: {
    eslint_only: AggregateMetrics;
    combined: AggregateMetrics;
  };
  latency: LatencyData;
  llm_status: {
    total_findings: number;
    errors: { test_case: string; error: string }[];
  };
}

const COLORS = {
  eslint: "#2a78d6",
  combined: "#eb6834",
};

const USABILITY_HEURISTICS = [
  {
    heuristic: "Visibility of system status",
    rating: 4,
    notes:
      "Loading spinners and status badges keep users informed during analysis. Real-time progress indicators show when code is being reviewed.",
  },
  {
    heuristic: "Match between system and real world",
    rating: 4,
    notes:
      'Uses familiar developer terminology (severity levels, ESLint rule IDs, line numbers). Risk levels map to industry-standard categories.',
  },
  {
    heuristic: "User control and freedom",
    rating: 3,
    notes:
      "Users can navigate between submissions and re-submit code. No undo for submissions, but results are non-destructive.",
  },
  {
    heuristic: "Consistency and standards",
    rating: 4,
    notes:
      "Consistent card-based layout across pages. Standard form patterns for authentication and code submission.",
  },
  {
    heuristic: "Error prevention",
    rating: 3,
    notes:
      "Authentication guards protected routes. Form validation prevents empty submissions. Could benefit from code syntax validation before submission.",
  },
  {
    heuristic: "Recognition rather than recall",
    rating: 4,
    notes:
      "Findings display inline with code context (line numbers). Risk summary provides at-a-glance severity overview.",
  },
  {
    heuristic: "Flexibility and efficiency",
    rating: 3,
    notes:
      "Supports both quick submissions and detailed result exploration. No keyboard shortcuts or batch operations yet.",
  },
  {
    heuristic: "Aesthetic and minimalist design",
    rating: 4,
    notes:
      "Clean, uncluttered interface with clear visual hierarchy. Color-coded severity badges provide quick scanning.",
  },
  {
    heuristic: "Help users recover from errors",
    rating: 3,
    notes:
      "Error messages are displayed for failed analyses. LLM failures fall back gracefully to ESLint-only results.",
  },
  {
    heuristic: "Help and documentation",
    rating: 2,
    notes:
      "Minimal in-app guidance. Users familiar with code review tools will adapt quickly, but new users may need onboarding.",
  },
];

export default function ResultsPage() {
  const [data, setData] = useState<EvalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runEval = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Evaluation failed");
      const json: EvalResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setLoading(false);
    }
  };

  const usabilityAvg =
    USABILITY_HEURISTICS.reduce((sum, h) => sum + h.rating, 0) /
    USABILITY_HEURISTICS.length;

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:underline mb-4 inline-block"
        >
          &larr; Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              System Evaluation Results
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Quantitative performance metrics, latency benchmarks, and
              qualitative usability assessment.
            </p>
          </div>
          <button
            onClick={runEval}
            disabled={loading}
            className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Running..." : "Run Evaluation"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && <LoadingSpinner />}

        {data && (
          <>
            <SummaryTiles
              aggregate={data.aggregate}
              latency={data.latency}
              testCount={data.results.length}
            />
            <AccuracyChart results={data.results} />
            <LatencyChart results={data.results} />
            <ResultsTable results={data.results} />
            <LatencySummaryTable latency={data.latency} />
          </>
        )}

        <UsabilityAssessment average={usabilityAvg} />

        {data && <Interpretation aggregate={data.aggregate} latency={data.latency} />}
      </div>
    </ProtectedRoute>
  );
}

function SummaryTiles({
  aggregate,
  latency,
  testCount,
}: {
  aggregate: EvalResponse["aggregate"];
  latency: LatencyData;
  testCount: number;
}) {
  const tiles = [
    {
      label: "Test Cases",
      value: String(testCount),
    },
    {
      label: "Combined F1",
      value: `${(aggregate.combined.f1_score * 100).toFixed(1)}%`,
    },
    {
      label: "Combined Precision",
      value: `${(aggregate.combined.precision * 100).toFixed(1)}%`,
    },
    {
      label: "Combined Recall",
      value: `${(aggregate.combined.recall * 100).toFixed(1)}%`,
    },
    {
      label: "Avg ESLint Latency",
      value: `${latency.eslint_avg_ms}ms`,
    },
    {
      label: "Avg LLM Latency",
      value: `${(latency.llm_avg_ms / 1000).toFixed(1)}s`,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-lg border border-gray-200 bg-white p-4 text-center"
        >
          <div className="text-2xl font-bold text-gray-900">{t.value}</div>
          <div className="text-xs text-gray-500 mt-1">{t.label}</div>
        </div>
      ))}
    </div>
  );
}

function AccuracyChart({ results }: { results: EvaluationResult[] }) {
  const chartData = results.map((r) => {
    const label =
      r.test_case.length > 20
        ? r.test_case.slice(0, 18) + "…"
        : r.test_case;
    return {
      name: label,
      "ESLint Only": Math.round(r.eslint_only.f1_score * 100),
      "Combined": Math.round(r.combined.f1_score * 100),
    };
  });

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Detection Accuracy (F1 Score) by Test Case
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        F1 score combines precision and recall into a single measure. Higher is
        better.
      </p>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 16, bottom: 48, left: 0 }}
            barGap={2}
            barCategoryGap="25%"
          >
            <CartesianGrid
              strokeDasharray=""
              stroke="#e1e0d9"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#898781" }}
              axisLine={{ stroke: "#c3c2b7" }}
              tickLine={false}
              angle={-30}
              textAnchor="end"
              height={60}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#898781" }}
              axisLine={{ stroke: "#c3c2b7" }}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              width={45}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                border: "1px solid #e1e0d9",
                borderRadius: 6,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
              formatter={(value) => [`${value}%`, undefined]}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar
              dataKey="ESLint Only"
              fill={COLORS.eslint}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey="Combined"
              fill={COLORS.combined}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LatencyChart({ results }: { results: EvaluationResult[] }) {
  const chartData = results.map((r) => {
    const label =
      r.test_case.length > 20
        ? r.test_case.slice(0, 18) + "…"
        : r.test_case;
    return {
      name: label,
      "ESLint": r.eslint_latency_ms,
      "LLM": r.llm_latency_ms,
    };
  });

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Analysis Latency by Test Case
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Time taken by each analyzer per test case. ESLint runs locally; LLM
        requires a network round-trip.
      </p>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 16, bottom: 48, left: 0 }}
            barGap={2}
            barCategoryGap="25%"
          >
            <CartesianGrid
              strokeDasharray=""
              stroke="#e1e0d9"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#898781" }}
              axisLine={{ stroke: "#c3c2b7" }}
              tickLine={false}
              angle={-30}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#898781" }}
              axisLine={{ stroke: "#c3c2b7" }}
              tickLine={false}
              tickFormatter={(v) => `${v}ms`}
              width={55}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                border: "1px solid #e1e0d9",
                borderRadius: 6,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
              formatter={(value) => [`${value}ms`, undefined]}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar
              dataKey="ESLint"
              fill={COLORS.eslint}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey="LLM"
              fill={COLORS.combined}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ResultsTable({ results }: { results: EvaluationResult[] }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Detection Accuracy — Per-Test Results
      </h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left font-medium" rowSpan={2}>
                Test Case
              </th>
              <th className="px-4 py-3 text-left font-medium" rowSpan={2}>
                Expected
              </th>
              <th
                className="px-3 py-2 text-center font-medium border-b border-gray-200"
                colSpan={3}
              >
                ESLint Only
              </th>
              <th
                className="px-3 py-2 text-center font-medium border-b border-gray-200"
                colSpan={3}
              >
                Combined (ESLint + AI)
              </th>
            </tr>
            <tr>
              <th className="px-3 py-2 text-center font-medium text-gray-500">
                Prec
              </th>
              <th className="px-3 py-2 text-center font-medium text-gray-500">
                Rec
              </th>
              <th className="px-3 py-2 text-center font-medium text-gray-500">
                F1
              </th>
              <th className="px-3 py-2 text-center font-medium text-gray-500">
                Prec
              </th>
              <th className="px-3 py-2 text-center font-medium text-gray-500">
                Rec
              </th>
              <th className="px-3 py-2 text-center font-medium text-gray-500">
                F1
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {results.map((r) => (
              <tr key={r.test_case} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                  {r.test_case}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">
                  {r.expected_count}
                </td>
                <td className="px-3 py-3 text-center tabular-nums">
                  {fmtPct(r.eslint_only.precision)}
                </td>
                <td className="px-3 py-3 text-center tabular-nums">
                  {fmtPct(r.eslint_only.recall)}
                </td>
                <td className="px-3 py-3 text-center tabular-nums font-medium">
                  {fmtPct(r.eslint_only.f1_score)}
                </td>
                <td className="px-3 py-3 text-center tabular-nums">
                  {fmtPct(r.combined.precision)}
                </td>
                <td className="px-3 py-3 text-center tabular-nums">
                  {fmtPct(r.combined.recall)}
                </td>
                <td className="px-3 py-3 text-center tabular-nums font-medium">
                  {fmtPct(r.combined.f1_score)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LatencySummaryTable({ latency }: { latency: LatencyData }) {
  const rows = [
    {
      metric: "ESLint analysis",
      avg: `${latency.eslint_avg_ms}ms`,
      min: `${latency.eslint_min_ms}ms`,
      max: `${latency.eslint_max_ms}ms`,
    },
    {
      metric: "LLM analysis",
      avg: `${latency.llm_avg_ms}ms`,
      min: `${latency.llm_min_ms}ms`,
      max: `${latency.llm_max_ms}ms`,
    },
    {
      metric: "Total (end-to-end)",
      avg: `${latency.total_avg_ms}ms`,
      min: "—",
      max: "—",
    },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Latency Summary
      </h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Component</th>
              <th className="px-4 py-3 text-center font-medium">Avg</th>
              <th className="px-4 py-3 text-center font-medium">Min</th>
              <th className="px-4 py-3 text-center font-medium">Max</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((r) => (
              <tr key={r.metric} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {r.metric}
                </td>
                <td className="px-4 py-3 text-center tabular-nums">
                  {r.avg}
                </td>
                <td className="px-4 py-3 text-center tabular-nums">{r.min}</td>
                <td className="px-4 py-3 text-center tabular-nums">{r.max}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsabilityAssessment({ average }: { average: number }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Qualitative Assessment — Interface Usability
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Evaluation based on Nielsen&apos;s 10 usability heuristics. Each
        heuristic rated 1 (poor) to 5 (excellent).
      </p>

      <div className="rounded-lg border border-gray-200 bg-white p-4 mb-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            {average.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Average Usability Score (out of 5)
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Heuristic</th>
              <th className="px-4 py-3 text-center font-medium w-24">
                Rating
              </th>
              <th className="px-4 py-3 text-left font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {USABILITY_HEURISTICS.map((h) => (
              <tr key={h.heuristic} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                  {h.heuristic}
                </td>
                <td className="px-4 py-3 text-center">
                  <RatingBar rating={h.rating} />
                </td>
                <td className="px-4 py-3 text-gray-600">{h.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RatingBar({ rating }: { rating: number }) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-sm ${
            i <= rating ? "bg-blue-500" : "bg-gray-200"
          }`}
        />
      ))}
      <span className="ml-1.5 text-xs tabular-nums text-gray-500 font-medium">
        {rating}/5
      </span>
    </div>
  );
}

function Interpretation({
  aggregate,
  latency,
}: {
  aggregate: EvalResponse["aggregate"];
  latency: LatencyData;
}) {
  const f1Improvement =
    aggregate.combined.f1_score - aggregate.eslint_only.f1_score;
  const recallImprovement =
    aggregate.combined.recall - aggregate.eslint_only.recall;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Interpretation
      </h2>
      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4 text-sm text-gray-700 leading-relaxed">
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">
            Detection Accuracy
          </h3>
          <p>
            The combined analysis (ESLint + AI) achieves an aggregate F1 score
            of{" "}
            <strong>
              {(aggregate.combined.f1_score * 100).toFixed(1)}%
            </strong>{" "}
            compared to{" "}
            <strong>
              {(aggregate.eslint_only.f1_score * 100).toFixed(1)}%
            </strong>{" "}
            for ESLint alone
            {f1Improvement > 0
              ? `, a ${(f1Improvement * 100).toFixed(1)} percentage-point improvement`
              : ""}
            . The LLM component primarily improves recall (
            {(recallImprovement * 100).toFixed(1)}pp gain), detecting issues
            that static analysis rules cannot express — such as XSS via
            innerHTML, missing await patterns, and async iteration
            anti-patterns. ESLint maintains higher precision for the rule-based
            patterns it covers (duplicate keys, invalid typeof, unreachable
            code).
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-1">Latency</h3>
          <p>
            ESLint analysis averages <strong>{latency.eslint_avg_ms}ms</strong>{" "}
            per test case — effectively instant for user-facing workflows. LLM
            analysis averages{" "}
            <strong>{(latency.llm_avg_ms / 1000).toFixed(1)}s</strong>,
            dominated by the network round-trip to AWS Bedrock. The end-to-end
            pipeline runs sequentially, so total latency is the sum of both.
            This latency is acceptable for an asynchronous code-review workflow
            but would benefit from parallel execution for real-time use cases.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-1">
            Interface Usability
          </h3>
          <p>
            The system scores <strong>3.4/5</strong> on Nielsen&apos;s usability
            heuristics. Strengths include clear visual hierarchy, consistent
            design patterns, and good use of familiar developer terminology. The
            primary gaps are in help/documentation (no in-app onboarding) and
            advanced efficiency features (no keyboard shortcuts or batch
            operations). The graceful LLM fallback behavior (reverting to
            ESLint-only on failure) is a notable reliability feature.
          </p>
        </div>
      </div>
    </div>
  );
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}
