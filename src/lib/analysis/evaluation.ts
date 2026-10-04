import type {
  AnalysisFinding,
  EvaluationTestCase,
  EvaluationMetrics,
  EvaluationResult,
  ExpectedFinding,
} from "@/types";
import { analyzeWithEslint } from "./eslint-analyzer";
import { analyzeWithLlm } from "./llm-analyzer";
import { deduplicateAndScoreFindings } from "./risk-scorer";

export const TEST_CASES: EvaluationTestCase[] = [
  {
    name: "Security vulnerabilities",
    code: `function processInput(userInput) {
  eval(userInput);
  const fn = new Function("return " + userInput);
  setTimeout("alert(" + userInput + ")", 100);
  return fn();
}`,
    expected_findings: [
      { category: "security", line: 2, description: "eval usage" },
      { category: "security", line: 3, description: "Function constructor" },
      { category: "security", line: 4, description: "implied eval via setTimeout string" },
    ],
  },
  {
    name: "Logic bugs and unreachable code",
    code: `function calculate(x) {
  if (x = 5) {
    return x * 2;
  }
  return x + 1;
  console.log("done");
}

function check(val) {
  if (typeof val === "undefned") {
    return false;
  }
  return true;
}`,
    expected_findings: [
      { category: "bug", line: 6, description: "unreachable code after return" },
      { category: "bug", line: 10, description: "invalid typeof comparison" },
    ],
  },
  {
    name: "Code quality issues",
    code: `var x = 10;
var y = 20;
var x = 30;

function process(data) {
  var result;
  if (data) {
    result = data.value;
  }
  return;
}

switch (action) {
  case "start":
    init();
  case "stop":
    cleanup();
    break;
}`,
    expected_findings: [
      { category: "quality", line: 3, description: "variable redeclaration" },
      { category: "quality", line: 10, description: "useless return" },
      { category: "quality", line: 15, description: "switch fallthrough" },
      { category: "quality", line: 1, description: "unused variable" },
    ],
  },
  {
    name: "Mixed severity issues",
    code: `function fetchData(url) {
  var data = null;
  eval("fetch('" + url + "')");

  if (data == null) {
    data = {};
  }

  for (var i = 0; i < 10; i++) {
    if (true) {
      break;
    }
  }

  var result = data;
  result = undefined;
  return result;
}`,
    expected_findings: [
      { category: "security", line: 3, description: "eval usage" },
      { category: "quality", line: 5, description: "loose equality" },
      { category: "bug", line: 10, description: "constant condition" },
      { category: "quality", line: 15, description: "unused variable or reassignment" },
    ],
  },
];

function matchFinding(
  finding: AnalysisFinding,
  expected: ExpectedFinding
): boolean {
  if (expected.line !== null && finding.line !== null) {
    if (Math.abs(finding.line - expected.line) > 1) return false;
  }

  const msg = finding.message.toLowerCase();
  const desc = expected.description.toLowerCase();
  const keywords = desc.split(/\s+/);
  const matchedKeywords = keywords.filter((k) => msg.includes(k));

  if (matchedKeywords.length >= Math.ceil(keywords.length * 0.4)) return true;

  const ruleId = (finding.rule_id ?? "").toLowerCase();
  if (ruleId && desc.includes(ruleId.replace("no-", ""))) return true;

  const category = finding.category ?? "";
  if (category === expected.category) {
    if (expected.line !== null && finding.line !== null) {
      if (Math.abs(finding.line - expected.line) <= 1) return true;
    }
  }

  return false;
}

function computeMetrics(
  findings: AnalysisFinding[],
  expected: ExpectedFinding[]
): EvaluationMetrics {
  const matchedExpected = new Set<number>();
  const matchedFindings = new Set<number>();

  for (let ei = 0; ei < expected.length; ei++) {
    for (let fi = 0; fi < findings.length; fi++) {
      if (matchedFindings.has(fi)) continue;
      if (matchFinding(findings[fi], expected[ei])) {
        matchedExpected.add(ei);
        matchedFindings.add(fi);
        break;
      }
    }
  }

  const tp = matchedExpected.size;
  const fp = findings.length - matchedFindings.size;
  const fn = expected.length - matchedExpected.size;

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

  return {
    true_positives: tp,
    false_positives: fp,
    false_negatives: fn,
    precision: Math.round(precision * 1000) / 1000,
    recall: Math.round(recall * 1000) / 1000,
    f1_score: Math.round(f1 * 1000) / 1000,
  };
}

export async function runEvaluation(): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];

  for (const testCase of TEST_CASES) {
    const eslintFindings = await analyzeWithEslint(testCase.code);
    const llmFindings = await analyzeWithLlm(testCase.code);
    const combined = [...eslintFindings, ...llmFindings];
    const { findings: scoredFindings } =
      deduplicateAndScoreFindings(combined);

    results.push({
      test_case: testCase.name,
      eslint_only: computeMetrics(eslintFindings, testCase.expected_findings),
      combined: computeMetrics(scoredFindings, testCase.expected_findings),
      eslint_findings: eslintFindings,
      combined_findings: scoredFindings,
      expected_count: testCase.expected_findings.length,
    });
  }

  return results;
}
