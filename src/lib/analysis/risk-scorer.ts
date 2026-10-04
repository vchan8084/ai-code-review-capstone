import type { AnalysisFinding, RiskSummary } from "@/types";

const SECURITY_RULES = new Set([
  "no-eval",
  "no-implied-eval",
  "no-new-func",
  "unsafe-eval",
  "prototype-pollution",
  "injection-risk",
  "unsafe-regex",
  "xss-risk",
  "command-injection",
]);

const BUG_RULES = new Set([
  "no-undef",
  "no-unreachable",
  "no-constant-condition",
  "no-dupe-keys",
  "no-duplicate-case",
  "no-func-assign",
  "no-ex-assign",
  "valid-typeof",
  "use-isnan",
  "null-deref-risk",
  "type-coercion",
  "infinite-loop",
  "off-by-one",
]);

function classifyRisk(
  finding: AnalysisFinding
): "critical" | "high" | "medium" | "low" {
  const ruleId = finding.rule_id ?? "";
  const category = finding.category ?? "";

  if (SECURITY_RULES.has(ruleId) || category === "security") {
    return finding.severity === 2 ? "critical" : "high";
  }

  if (BUG_RULES.has(ruleId) || category === "bug") {
    return finding.severity === 2 ? "high" : "medium";
  }

  return finding.severity === 2 ? "medium" : "low";
}

function areDuplicates(a: AnalysisFinding, b: AnalysisFinding): boolean {
  if (a.line !== null && b.line !== null && a.line === b.line) {
    if (a.rule_id && b.rule_id && a.rule_id === b.rule_id) return true;

    const aNorm = a.message.toLowerCase();
    const bNorm = b.message.toLowerCase();
    const aWords = new Set(aNorm.split(/\s+/));
    const bWords = new Set(bNorm.split(/\s+/));
    const intersection = [...aWords].filter((w) => bWords.has(w));
    const union = new Set([...aWords, ...bWords]);
    const similarity = intersection.length / union.size;
    if (similarity > 0.5) return true;
  }

  return false;
}

export function deduplicateAndScoreFindings(
  findings: AnalysisFinding[]
): { findings: AnalysisFinding[]; risk_summary: RiskSummary } {
  const scored = findings.map((f) => ({
    ...f,
    risk_level: classifyRisk(f),
    confidence: f.source === "eslint" ? 0.95 : 0.8,
  }));

  const eslintFindings = scored.filter((f) => f.source === "eslint");
  const llmFindings = scored.filter((f) => f.source === "llm");

  const merged: AnalysisFinding[] = [...eslintFindings];
  let deduplicatedCount = 0;

  for (const llmFinding of llmFindings) {
    const duplicate = eslintFindings.find((ef) =>
      areDuplicates(ef, llmFinding)
    );
    if (duplicate) {
      deduplicatedCount++;
      const idx = merged.indexOf(duplicate);
      if (idx !== -1) {
        merged[idx] = { ...merged[idx], confidence: 1.0 };
        if (duplicate.suggestion === null && llmFinding.suggestion !== null) {
          merged[idx] = { ...merged[idx], suggestion: llmFinding.suggestion };
        }
      }
    } else {
      merged.push(llmFinding);
    }
  }

  const RISK_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  merged.sort((a, b) => {
    const riskDiff =
      RISK_ORDER[a.risk_level ?? "low"] - RISK_ORDER[b.risk_level ?? "low"];
    if (riskDiff !== 0) return riskDiff;
    return b.severity - a.severity;
  });

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of merged) {
    counts[f.risk_level ?? "low"]++;
  }

  const overallRisk: RiskSummary["overall_risk"] =
    merged.length === 0
      ? "none"
      : counts.critical > 0
        ? "critical"
        : counts.high > 0
          ? "high"
          : counts.medium > 0
            ? "medium"
            : "low";

  return {
    findings: merged,
    risk_summary: {
      overall_risk: overallRisk,
      critical_count: counts.critical,
      high_count: counts.high,
      medium_count: counts.medium,
      low_count: counts.low,
      total_findings: merged.length,
      eslint_count: eslintFindings.length,
      llm_count: llmFindings.length,
      deduplicated_count: deduplicatedCount,
    },
  };
}
