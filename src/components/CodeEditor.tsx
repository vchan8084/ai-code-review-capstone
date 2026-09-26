"use client";

import { useRef } from "react";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  highlightLines?: number[];
}

export default function CodeEditor({
  value,
  onChange,
  readOnly = false,
  highlightLines = [],
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lines = value.split("\n");
  const lineCount = lines.length;

  if (readOnly) {
    return (
      <div className="rounded-lg border border-gray-300 bg-gray-50 overflow-auto max-h-96">
        <table className="w-full">
          <tbody>
            {lines.map((line, i) => (
              <tr
                key={i}
                className={
                  highlightLines.includes(i + 1)
                    ? "bg-red-100"
                    : i % 2 === 0
                      ? "bg-gray-50"
                      : "bg-white"
                }
              >
                <td className="px-3 py-0 text-right text-xs text-gray-400 select-none w-10 font-mono border-r border-gray-200">
                  {i + 1}
                </td>
                <td className="px-3 py-0 font-mono text-sm whitespace-pre">
                  {line || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg border border-gray-300 bg-white overflow-hidden">
      <div className="flex">
        <div className="py-3 px-2 bg-gray-50 border-r border-gray-200 select-none text-right">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="text-xs text-gray-400 font-mono leading-6">
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="flex-1 p-3 font-mono text-sm leading-6 resize-none outline-none min-h-[300px]"
          placeholder="Paste your JavaScript code here..."
          spellCheck={false}
        />
      </div>
    </div>
  );
}
