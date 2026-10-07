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
  {
    name: "Duplicate keys, NaN comparison, and duplicate cases",
    code: `function configure(timeout) {
  var settings = {
    timeout: timeout,
    retries: 3,
    timeout: 5000,
  };
  return settings;
}

function isValid(value) {
  if (value === NaN) {
    return false;
  }
  return value > 0;
}

function getLabel(code) {
  switch (code) {
    case 200:
      return "OK";
    case 404:
      return "Not Found";
    case 200:
      return "Success";
    default:
      return "Unknown";
  }
}`,
    expected_findings: [
      { category: "bug", line: 5, description: "duplicate key" },
      { category: "bug", line: 11, description: "comparison with NaN" },
      { category: "bug", line: 23, description: "duplicate case" },
    ],
  },
  {
    name: "Function reassignment and exception handling",
    code: `function processData(input) {
  return input * 2;
}

processData = "not a function";

function handleJson(value) {
  try {
    return JSON.parse(value);
  } catch (err) {
    err = "something went wrong";
    console.log(err);
  }
}

function outer(flag) {
  if (flag) {
    function inner() {
      return 42;
    }
    return inner();
  }
  return 0;
}`,
    expected_findings: [
      { category: "bug", line: 5, description: "function reassignment" },
      { category: "bug", line: 11, description: "exception variable reassignment" },
      { category: "bug", line: 19, description: "inner function declaration" },
    ],
  },
  {
    name: "Self-comparison, self-assignment, and extra boolean cast",
    code: `function checkValue(x) {
  if (x === x) {
    return true;
  }

  var result = x * 2;
  result = result;

  if (!!!result) {
    return false;
  }

  return result;
}`,
    expected_findings: [
      { category: "quality", line: 2, description: "self-comparison" },
      { category: "quality", line: 7, description: "self-assignment" },
      { category: "quality", line: 9, description: "extra boolean cast" },
    ],
  },
  {
    name: "XSS and DOM injection vulnerabilities",
    code: `function renderComment(userComment) {
  document.getElementById("output").innerHTML = userComment;
  document.write("<div>" + userComment + "</div>");

  var element = document.createElement("div");
  element.innerHTML = "<img src=x onerror='" + userComment + "'>";
  document.body.appendChild(element);
}

function loadScript(src) {
  var script = document.createElement("script");
  script.src = src;
  document.head.appendChild(script);
}`,
    expected_findings: [
      { category: "security", line: 2, description: "XSS via innerHTML" },
      { category: "security", line: 3, description: "XSS via document.write" },
      { category: "security", line: 6, description: "XSS via innerHTML with event handler" },
      { category: "security", line: 12, description: "dynamic script loading" },
    ],
  },
  {
    name: "Missing await and async iteration anti-patterns",
    code: `async function fetchUserData(userId) {
  var response = fetch("/api/users/" + userId);
  var data = response.json();
  return data;
}

function processAll(items) {
  var results = [];
  items.forEach(async function(item) {
    var resp = await fetch("/api/process/" + item);
    results.push(resp);
  });
  return results;
}`,
    expected_findings: [
      { category: "bug", line: 2, description: "missing await on fetch" },
      { category: "bug", line: 3, description: "calling method on unresolved promise" },
      { category: "bug", line: 9, description: "async callback in forEach" },
    ],
  },
  {
    name: "Type coercion traps and invalid typeof",
    code: `function processValue(input) {
  if (input == null) {
    return "empty";
  }

  if (input == 0) {
    return "zero";
  }

  if (input == false) {
    return "falsy";
  }

  if (typeof input === "strang") {
    return input.toUpperCase();
  }

  return String(input);
}`,
    expected_findings: [
      { category: "quality", line: 2, description: "loose equality" },
      { category: "quality", line: 6, description: "loose equality" },
      { category: "quality", line: 10, description: "loose equality" },
      { category: "bug", line: 14, description: "invalid typeof comparison" },
    ],
  },
];

export function matchFinding(
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

export function computeMetrics(
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
    const totalStart = performance.now();

    const eslintStart = performance.now();
    const eslintFindings = await analyzeWithEslint(testCase.code);
    const eslintLatency = performance.now() - eslintStart;

    let llmFindings: Awaited<ReturnType<typeof analyzeWithLlm>> = [];
    let llmError: string | undefined;
    const llmStart = performance.now();
    try {
      llmFindings = await analyzeWithLlm(testCase.code);
    } catch (err) {
      llmError =
        err instanceof Error ? err.message : "LLM analysis failed";
    }
    const llmLatency = performance.now() - llmStart;

    const combined = [...eslintFindings, ...llmFindings];
    const { findings: scoredFindings } =
      deduplicateAndScoreFindings(combined);

    const totalLatency = performance.now() - totalStart;

    results.push({
      test_case: testCase.name,
      eslint_only: computeMetrics(eslintFindings, testCase.expected_findings),
      combined: computeMetrics(scoredFindings, testCase.expected_findings),
      eslint_findings: eslintFindings,
      combined_findings: scoredFindings,
      expected_count: testCase.expected_findings.length,
      llm_finding_count: llmFindings.length,
      llm_error: llmError,
      eslint_latency_ms: Math.round(eslintLatency),
      llm_latency_ms: Math.round(llmLatency),
      total_latency_ms: Math.round(totalLatency),
    });
  }

  return results;
}
