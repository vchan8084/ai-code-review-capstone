import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/middleware";
import { runEvaluation } from "@/lib/analysis/evaluation";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const results = await runEvaluation();

  const eslintTotals = { tp: 0, fp: 0, fn: 0 };
  const combinedTotals = { tp: 0, fp: 0, fn: 0 };

  for (const r of results) {
    eslintTotals.tp += r.eslint_only.true_positives;
    eslintTotals.fp += r.eslint_only.false_positives;
    eslintTotals.fn += r.eslint_only.false_negatives;
    combinedTotals.tp += r.combined.true_positives;
    combinedTotals.fp += r.combined.false_positives;
    combinedTotals.fn += r.combined.false_negatives;
  }

  const eslintPrecision =
    eslintTotals.tp + eslintTotals.fp > 0
      ? eslintTotals.tp / (eslintTotals.tp + eslintTotals.fp)
      : 0;
  const eslintRecall =
    eslintTotals.tp + eslintTotals.fn > 0
      ? eslintTotals.tp / (eslintTotals.tp + eslintTotals.fn)
      : 0;
  const combinedPrecision =
    combinedTotals.tp + combinedTotals.fp > 0
      ? combinedTotals.tp / (combinedTotals.tp + combinedTotals.fp)
      : 0;
  const combinedRecall =
    combinedTotals.tp + combinedTotals.fn > 0
      ? combinedTotals.tp / (combinedTotals.tp + combinedTotals.fn)
      : 0;

  const llmErrors = results
    .filter((r) => r.llm_error)
    .map((r) => ({ test_case: r.test_case, error: r.llm_error }));
  const totalLlmFindings = results.reduce(
    (sum, r) => sum + r.llm_finding_count,
    0
  );

  const eslintLatencies = results.map((r) => r.eslint_latency_ms);
  const llmLatencies = results.map((r) => r.llm_latency_ms);
  const totalLatencies = results.map((r) => r.total_latency_ms);

  return NextResponse.json({
    results,
    aggregate: {
      eslint_only: {
        precision: Math.round(eslintPrecision * 1000) / 1000,
        recall: Math.round(eslintRecall * 1000) / 1000,
        f1_score:
          eslintPrecision + eslintRecall > 0
            ? Math.round(
                ((2 * eslintPrecision * eslintRecall) /
                  (eslintPrecision + eslintRecall)) *
                  1000
              ) / 1000
            : 0,
      },
      combined: {
        precision: Math.round(combinedPrecision * 1000) / 1000,
        recall: Math.round(combinedRecall * 1000) / 1000,
        f1_score:
          combinedPrecision + combinedRecall > 0
            ? Math.round(
                ((2 * combinedPrecision * combinedRecall) /
                  (combinedPrecision + combinedRecall)) *
                  1000
              ) / 1000
            : 0,
      },
    },
    latency: {
      eslint_avg_ms: Math.round(eslintLatencies.reduce((a, b) => a + b, 0) / eslintLatencies.length),
      llm_avg_ms: Math.round(llmLatencies.reduce((a, b) => a + b, 0) / llmLatencies.length),
      total_avg_ms: Math.round(totalLatencies.reduce((a, b) => a + b, 0) / totalLatencies.length),
      eslint_min_ms: Math.min(...eslintLatencies),
      eslint_max_ms: Math.max(...eslintLatencies),
      llm_min_ms: Math.min(...llmLatencies),
      llm_max_ms: Math.max(...llmLatencies),
    },
    llm_status: {
      total_findings: totalLlmFindings,
      errors: llmErrors,
    },
  });
}
