"use client";

export default function FindingSeverityBadge({
  severity,
}: {
  severity: number;
}) {
  if (severity === 2) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
      Warning
    </span>
  );
}

export function RiskLevelBadge({
  level,
}: {
  level: string | null;
}) {
  const colors: Record<string, { bg: string; text: string }> = {
    critical: { bg: "#DC262620", text: "#DC2626" },
    high: { bg: "#EA580C20", text: "#EA580C" },
    medium: { bg: "#D9770620", text: "#D97706" },
    low: { bg: "#16A34A20", text: "#16A34A" },
  };

  const display = level ?? "low";
  const color = colors[display] ?? colors.low;

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {display.charAt(0).toUpperCase() + display.slice(1)}
    </span>
  );
}

export function SourceBadge({ source }: { source: string }) {
  if (source === "llm") {
    return (
      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
        AI
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
      ESLint
    </span>
  );
}
