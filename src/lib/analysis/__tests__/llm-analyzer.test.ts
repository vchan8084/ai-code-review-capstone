import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn();

vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
  BedrockRuntimeClient: vi.fn(() => ({ send: mockSend })),
  ConverseCommand: vi.fn((input: unknown) => input),
}));

import { analyzeWithLlm } from "../llm-analyzer";

function bedrockResponse(text: string) {
  return {
    output: {
      message: {
        content: [{ text }],
      },
    },
  };
}

describe("analyzeWithLlm", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it("parses a valid JSON response into AnalysisFinding[]", async () => {
    const llmJson = JSON.stringify([
      {
        rule_id: "no-eval",
        severity: 2,
        message: "Avoid eval()",
        line: 3,
        column: 1,
        suggestion: "Use a safer alternative",
        category: "security",
      },
    ]);
    mockSend.mockResolvedValueOnce(bedrockResponse(llmJson));

    const findings = await analyzeWithLlm("eval('x')");

    expect(findings).toHaveLength(1);
    expect(findings[0]).toEqual({
      source: "llm",
      rule_id: "no-eval",
      severity: 2,
      message: "Avoid eval()",
      line: 3,
      column: 1,
      end_line: null,
      end_column: null,
      suggestion: "Use a safer alternative",
      category: "security",
    });
  });

  it("strips markdown code fences before parsing", async () => {
    const wrapped = '```json\n[{"rule_id":"x","severity":1,"message":"m","line":1,"column":null,"suggestion":null,"category":"quality"}]\n```';
    mockSend.mockResolvedValueOnce(bedrockResponse(wrapped));

    const findings = await analyzeWithLlm("const a = 1;");
    expect(findings).toHaveLength(1);
    expect(findings[0].rule_id).toBe("x");
  });

  it("returns empty array when LLM returns empty text", async () => {
    mockSend.mockResolvedValueOnce(bedrockResponse(""));

    const findings = await analyzeWithLlm("const a = 1;");
    expect(findings).toEqual([]);
  });

  it("returns empty array when LLM returns '[]'", async () => {
    mockSend.mockResolvedValueOnce(bedrockResponse("[]"));

    const findings = await analyzeWithLlm("const a = 1;");
    expect(findings).toEqual([]);
  });

  it("returns empty array when response has no content blocks", async () => {
    mockSend.mockResolvedValueOnce({ output: { message: { content: [] } } });

    const findings = await analyzeWithLlm("const a = 1;");
    expect(findings).toEqual([]);
  });

  it("throws when LLM response is not valid JSON", async () => {
    mockSend.mockResolvedValueOnce(bedrockResponse("not json at all"));

    await expect(analyzeWithLlm("code")).rejects.toThrow(
      "Failed to parse LLM response as JSON"
    );
  });

  it("throws when LLM response is valid JSON but not an array", async () => {
    mockSend.mockResolvedValueOnce(bedrockResponse('{"single": "object"}'));

    await expect(analyzeWithLlm("code")).rejects.toThrow(
      "LLM response was not a JSON array"
    );
  });

  it("clamps severity to 1 for values other than 2", async () => {
    const llmJson = JSON.stringify([
      { rule_id: "a", severity: 5, message: "m", line: 1, column: 1, suggestion: null, category: "bug" },
      { rule_id: "b", severity: 0, message: "m2", line: 2, column: 1, suggestion: null, category: "bug" },
    ]);
    mockSend.mockResolvedValueOnce(bedrockResponse(llmJson));

    const findings = await analyzeWithLlm("code");
    expect(findings[0].severity).toBe(1);
    expect(findings[1].severity).toBe(1);
  });

  it("handles missing optional fields with defaults", async () => {
    const llmJson = JSON.stringify([
      { message: "something wrong" },
    ]);
    mockSend.mockResolvedValueOnce(bedrockResponse(llmJson));

    const findings = await analyzeWithLlm("code");
    expect(findings[0]).toEqual({
      source: "llm",
      rule_id: null,
      severity: 1,
      message: "something wrong",
      line: null,
      column: null,
      end_line: null,
      end_column: null,
      suggestion: null,
      category: "quality",
    });
  });

  it("handles multiple findings", async () => {
    const llmJson = JSON.stringify([
      { rule_id: "a", severity: 2, message: "first", line: 1, column: 1, suggestion: null, category: "bug" },
      { rule_id: "b", severity: 1, message: "second", line: 5, column: 3, suggestion: "fix it", category: "quality" },
      { rule_id: "c", severity: 2, message: "third", line: 10, column: null, suggestion: null, category: "security" },
    ]);
    mockSend.mockResolvedValueOnce(bedrockResponse(llmJson));

    const findings = await analyzeWithLlm("code");
    expect(findings).toHaveLength(3);
    expect(findings.map((f) => f.source)).toEqual(["llm", "llm", "llm"]);
    expect(findings.map((f) => f.severity)).toEqual([2, 1, 2]);
  });

  it("propagates Bedrock client errors", async () => {
    mockSend.mockRejectedValueOnce(new Error("Bedrock service unavailable"));

    await expect(analyzeWithLlm("code")).rejects.toThrow(
      "Bedrock service unavailable"
    );
  });

  it("concatenates text from multiple content blocks", async () => {
    const part1 = '[{"rule_id":"a","severity":1,"message":"m",';
    const part2 = '"line":1,"column":1,"suggestion":null,"category":"quality"}]';
    mockSend.mockResolvedValueOnce({
      output: {
        message: {
          content: [{ text: part1 }, { text: part2 }],
        },
      },
    });

    const findings = await analyzeWithLlm("code");
    expect(findings).toHaveLength(1);
    expect(findings[0].rule_id).toBe("a");
  });
});
