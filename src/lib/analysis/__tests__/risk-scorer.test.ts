import { describe, it, expect } from "vitest";
import { deduplicateAndScoreFindings } from "../risk-scorer";
import type { AnalysisFinding } from "@/types";

function makeFinding(overrides: Partial<AnalysisFinding> = {}): AnalysisFinding {
  return {
    source: "eslint",
    rule_id: null,
    severity: 1,
    message: "test message",
    line: 1,
    column: 1,
    end_line: null,
    end_column: null,
    suggestion: null,
    ...overrides,
  };
}

describe("deduplicateAndScoreFindings", () => {
  describe("risk classification", () => {
    it("classifies security rule with severity 2 as critical", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ rule_id: "no-eval", severity: 2 }),
      ]);
      expect(result.findings[0].risk_level).toBe("critical");
    });

    it("classifies security rule with severity 1 as high", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ rule_id: "xss-risk", severity: 1 }),
      ]);
      expect(result.findings[0].risk_level).toBe("high");
    });

    it("classifies security category (no matching rule_id) as critical/high", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ rule_id: "custom-sec-rule", severity: 2, category: "security" }),
      ]);
      expect(result.findings[0].risk_level).toBe("critical");
    });

    it("classifies bug rule with severity 2 as high", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ rule_id: "no-undef", severity: 2 }),
      ]);
      expect(result.findings[0].risk_level).toBe("high");
    });

    it("classifies bug rule with severity 1 as medium", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ rule_id: "no-unreachable", severity: 1 }),
      ]);
      expect(result.findings[0].risk_level).toBe("medium");
    });

    it("classifies other finding with severity 2 as medium", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ rule_id: "some-style-rule", severity: 2 }),
      ]);
      expect(result.findings[0].risk_level).toBe("medium");
    });

    it("classifies other finding with severity 1 as low", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ rule_id: "prefer-const", severity: 1 }),
      ]);
      expect(result.findings[0].risk_level).toBe("low");
    });
  });

  describe("confidence assignment", () => {
    it("assigns 0.95 confidence to eslint findings", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ source: "eslint" }),
      ]);
      expect(result.findings[0].confidence).toBe(0.95);
    });

    it("assigns 0.8 confidence to llm findings", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ source: "llm" }),
      ]);
      expect(result.findings[0].confidence).toBe(0.8);
    });
  });

  describe("deduplication", () => {
    it("merges duplicate on same line with same rule_id and boosts confidence to 1.0", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ source: "eslint", rule_id: "no-eval", line: 5, severity: 2 }),
        makeFinding({ source: "llm", rule_id: "no-eval", line: 5, severity: 2 }),
      ]);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].confidence).toBe(1.0);
      expect(result.findings[0].source).toBe("eslint");
    });

    it("merges duplicate on same line with high word similarity", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ source: "eslint", line: 3, message: "unexpected use of eval function" }),
        makeFinding({ source: "llm", line: 3, message: "dangerous use of eval function detected" }),
      ]);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].confidence).toBe(1.0);
    });

    it("keeps both findings on same line with low word similarity", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ source: "eslint", line: 3, message: "missing semicolon" }),
        makeFinding({ source: "llm", line: 3, message: "potential null dereference on object access" }),
      ]);
      expect(result.findings).toHaveLength(2);
    });

    it("keeps both findings on different lines even with same rule_id", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ source: "eslint", rule_id: "no-eval", line: 5 }),
        makeFinding({ source: "llm", rule_id: "no-eval", line: 10 }),
      ]);
      expect(result.findings).toHaveLength(2);
    });

    it("inherits LLM suggestion when eslint finding has none", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ source: "eslint", rule_id: "no-eval", line: 5, suggestion: null }),
        makeFinding({ source: "llm", rule_id: "no-eval", line: 5, suggestion: "Use a safer alternative" }),
      ]);
      expect(result.findings[0].suggestion).toBe("Use a safer alternative");
    });

    it("does not overwrite existing eslint suggestion", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ source: "eslint", rule_id: "no-eval", line: 5, suggestion: "Remove eval" }),
        makeFinding({ source: "llm", rule_id: "no-eval", line: 5, suggestion: "Use a safer alternative" }),
      ]);
      expect(result.findings[0].suggestion).toBe("Remove eval");
    });
  });

  describe("sorting", () => {
    it("sorts by risk level (critical first) then by severity descending", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ rule_id: "prefer-const", severity: 1 }),
        makeFinding({ rule_id: "no-eval", severity: 2 }),
        makeFinding({ rule_id: "no-undef", severity: 1 }),
      ]);
      expect(result.findings.map((f) => f.risk_level)).toEqual([
        "critical",
        "medium",
        "low",
      ]);
    });
  });

  describe("risk summary", () => {
    it("returns all zeros and overall_risk 'none' for empty input", () => {
      const result = deduplicateAndScoreFindings([]);
      expect(result.risk_summary).toEqual({
        overall_risk: "none",
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        total_findings: 0,
        eslint_count: 0,
        llm_count: 0,
        deduplicated_count: 0,
      });
    });

    it("sets overall_risk to 'critical' when a critical finding exists", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ rule_id: "no-eval", severity: 2 }),
        makeFinding({ rule_id: "prefer-const", severity: 1 }),
      ]);
      expect(result.risk_summary.overall_risk).toBe("critical");
      expect(result.risk_summary.critical_count).toBe(1);
      expect(result.risk_summary.low_count).toBe(1);
      expect(result.risk_summary.total_findings).toBe(2);
    });

    it("tracks deduplicated_count accurately", () => {
      const result = deduplicateAndScoreFindings([
        makeFinding({ source: "eslint", rule_id: "no-eval", line: 5 }),
        makeFinding({ source: "llm", rule_id: "no-eval", line: 5 }),
      ]);
      expect(result.risk_summary.deduplicated_count).toBe(1);
      expect(result.risk_summary.total_findings).toBe(1);
    });
  });
});
