"use client";

import { useState } from "react";
import type { TableBlock as TableBlockType } from "@/types/notebook";

interface TableBlockProps {
  block: TableBlockType;
  onUpdate: (block: TableBlockType) => void;
}

export default function TableBlock({ block, onUpdate }: TableBlockProps) {
  const [headers, setHeaders] = useState(block.headers);
  const [rows, setRows] = useState(block.rows);

  const handleBlur = () => {
    if (
      JSON.stringify(headers) !== JSON.stringify(block.headers) ||
      JSON.stringify(rows) !== JSON.stringify(block.rows)
    ) {
      onUpdate({ ...block, headers, rows });
    }
  };

  const addRow = () => {
    const newRow = headers.map(() => "");
    setRows([...rows, newRow]);
    onUpdate({ ...block, rows: [...rows, newRow] });
  };

  const removeRow = () => {
    if (rows.length <= 1) return;
    const next = rows.slice(0, -1);
    setRows(next);
    onUpdate({ ...block, rows: next });
  };

  const addCol = () => {
    const newHeaders = [...headers, `Col ${headers.length + 1}`];
    const newRows = rows.map((r) => [...r, ""]);
    setHeaders(newHeaders);
    setRows(newRows);
    onUpdate({ ...block, headers: newHeaders, rows: newRows });
  };

  const removeCol = () => {
    if (headers.length <= 1) return;
    const newHeaders = headers.slice(0, -1);
    const newRows = rows.map((r) => r.slice(0, -1));
    setHeaders(newHeaders);
    setRows(newRows);
    onUpdate({ ...block, headers: newHeaders, rows: newRows });
  };

  const updateHeader = (i: number, v: string) => {
    const next = [...headers];
    next[i] = v;
    setHeaders(next);
    onUpdate({ ...block, headers: next });
  };

  const updateCell = (ri: number, ci: number, v: string) => {
    const next = rows.map((r) => [...r]);
    next[ri][ci] = v;
    setRows(next);
    onUpdate({ ...block, rows: next });
  };

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/10 bg-neutral-800/80 px-2 py-1">
        <button
          type="button"
          onClick={addRow}
          className="rounded px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
        >
          + Row
        </button>
        <button
          type="button"
          onClick={removeRow}
          className="rounded px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
        >
          − Row
        </button>
        <span className="h-4 w-px bg-white/20" />
        <button
          type="button"
          onClick={addCol}
          className="rounded px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
        >
          + Col
        </button>
        <button
          type="button"
          onClick={removeCol}
          className="rounded px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
        >
          − Col
        </button>
      </div>
      <div className="overflow-x-auto" onBlur={handleBlur}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="border border-white/20 p-2">
                  <input
                    type="text"
                    value={h}
                    onChange={(e) => updateHeader(i, e.target.value)}
                    className="w-full min-w-[80px] bg-neutral-900/80 px-2 py-1 text-sm font-medium text-white"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-white/20 p-2">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      className="w-full min-w-[80px] bg-neutral-900/80 px-2 py-1 text-sm text-white"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
