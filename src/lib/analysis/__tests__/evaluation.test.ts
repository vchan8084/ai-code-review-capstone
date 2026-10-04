import { describe, it, expect } from "vitest";
import { matchFinding, computeMetrics } from "../evaluation";
import type { AnalysisFinding, ExpectedFinding } from "@/types";

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

function makeExpected(overrides: Partial<ExpectedFinding> = {}): ExpectedFinding {
  return {
    category: "bug",
    line: 1,
    description: "test description",
    ...overrides,
  };
}

describe("matchFinding", () => {
  it("matches when line proximity <= 1 and keyword overlap >= 40%", () => {
    const finding = makeFinding({ line: 5, message: "eval usage is dangerous" });
    const expected = makeExpected({ line: 5, description: "eval usage" });
    expect(matchFinding(finding, expected)).toBe(true);
  });

  it("rejects when keyword overlap < 40% even on same line", () => {
    const finding = makeFinding({ line: 5, message: "missing semicolon at end of statement" });
    const expected = makeExpected({ line: 5, description: "eval usage" });
    expect(matchFinding(finding, expected)).toBe(false);
  });

  it("rejects when line distance > 1 even with keyword match", () => {
    const finding = makeFinding({ line: 10, message: "eval usage is dangerous" });
    const expected = makeExpected({ line: 5, description: "eval usage" });
    expect(matchFinding(finding, expected)).toBe(false);
  });

  it("matches on adjacent line (proximity = 1)", () => {
    const finding = makeFinding({ line: 6, message: "eval usage is dangerous" });
    const expected = makeExpected({ line: 5, description: "eval usage" });
    expect(matchFinding(finding, expected)).toBe(true);
  });

  it("matches via rule_id substring", () => {
    const finding = makeFinding({ rule_id: "no-eval", line: 5, message: "unexpected eval" });
    const expected = makeExpected({ line: 5, description: "eval usage" });
    expect(matchFinding(finding, expected)).toBe(true);
  });

  it("matches via same category and line proximity", () => {
    const finding = makeFinding({ line: 5, message: "something completely different", category: "security" });
    const expected = makeExpected({ line: 5, category: "security", description: "injection attack vector" });
    expect(matchFinding(finding, expected)).toBe(true);
  });

  it("rejects completely unrelated finding", () => {
    const finding = makeFinding({ line: 20, message: "unused variable x", category: "quality" });
    const expected = makeExpected({ line: 5, category: "security", description: "eval usage" });
    expect(matchFinding(finding, expected)).toBe(false);
  });
});

describe("computeMetrics", () => {
  it("returns perfect scores when all expected are found", () => {
    const findings = [
      makeFinding({ line: 2, message: "eval usage is dangerous" }),
      makeFinding({ line: 6, message: "unreachable code after return" }),
    ];
    const expected = [
      makeExpected({ line: 2, description: "eval usage" }),
      makeExpected({ line: 6, description: "unreachable code after return" }),
    ];
    const metrics = computeMetrics(findings, expected);
    expect(metrics.precision).toBe(1);
    expect(metrics.recall).toBe(1);
    expect(metrics.f1_score).toBe(1);
  });

  it("returns zeros when nothing matches", () => {
    const findings = [makeFinding({ line: 20, message: "unrelated issue" })];
    const expected = [makeExpected({ line: 5, description: "eval usage" })];
    const metrics = computeMetrics(findings, expected);
    expect(metrics.true_positives).toBe(0);
    expect(metrics.false_positives).toBe(1);
    expect(metrics.false_negatives).toBe(1);
    expect(metrics.precision).toBe(0);
    expect(metrics.recall).toBe(0);
    expect(metrics.f1_score).toBe(0);
  });

  it("computes correct partial metrics", () => {
    const findings = [
      makeFinding({ line: 2, message: "eval usage" }),
      makeFinding({ line: 30, message: "style issue" }),
    ];
    const expected = [
      makeExpected({ line: 2, description: "eval usage" }),
      makeExpected({ line: 6, description: "unreachable code" }),
    ];
    const metrics = computeMetrics(findings, expected);
    expect(metrics.true_positives).toBe(1);
    expect(metrics.false_positives).toBe(1);
    expect(metrics.false_negatives).toBe(1);
    expect(metrics.precision).toBe(0.5);
    expect(metrics.recall).toBe(0.5);
  });

  it("handles empty findings (all false negatives)", () => {
    const expected = [
      makeExpected({ line: 2, description: "eval" }),
      makeExpected({ line: 6, description: "unreachable" }),
    ];
    const metrics = computeMetrics([], expected);
    expect(metrics.true_positives).toBe(0);
    expect(metrics.false_positives).toBe(0);
    expect(metrics.false_negatives).toBe(2);
  });

  it("handles empty expected (all false positives)", () => {
    const findings = [makeFinding(), makeFinding({ line: 5 })];
    const metrics = computeMetrics(findings, []);
    expect(metrics.true_positives).toBe(0);
    expect(metrics.false_positives).toBe(2);
    expect(metrics.false_negatives).toBe(0);
  });

  it("returns all zeros when both are empty", () => {
    const metrics = computeMetrics([], []);
    expect(metrics).toEqual({
      true_positives: 0,
      false_positives: 0,
      false_negatives: 0,
      precision: 0,
      recall: 0,
      f1_score: 0,
    });
  });

  it("rounds values to 3 decimal places", () => {
    const findings = [
      makeFinding({ line: 2, message: "eval usage" }),
      makeFinding({ line: 10, message: "extra finding one" }),
      makeFinding({ line: 20, message: "extra finding two" }),
    ];
    const expected = [
      makeExpected({ line: 2, description: "eval usage" }),
      makeExpected({ line: 6, description: "unreachable code" }),
    ];
    const metrics = computeMetrics(findings, expected);
    expect(metrics.precision).toBe(0.333);
    expect(metrics.recall).toBe(0.5);
    const expectedF1 = Math.round(((2 * 0.333 * 0.5) / (0.333 + 0.5)) * 1000) / 1000;
    expect(metrics.f1_score).toBe(expectedF1);
  });
});
