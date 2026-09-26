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
