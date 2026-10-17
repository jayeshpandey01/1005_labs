"use client";

import React, { useState } from "react";
import { Table2, ChevronDown, ChevronUp } from "lucide-react";

interface ResultTableProps {
  table?: Record<string, any>[];
}

export const ResultTable: React.FC<ResultTableProps> = ({ table }) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!table || table.length === 0) return null;

  const columns = Object.keys(table[0]);

  const formatCellValue = (val: any) => {
    if (val === undefined || val === null) return "—";
    if (typeof val === "number") {
      if (val > 100000) {
        return `₹${(val / 100000).toFixed(1)}L`;
      }
      return val.toLocaleString();
    }
    const str = String(val);
    return str.length > 35 ? `${str.slice(0, 35)}…` : str;
  };

  return (
    <div className="my-2 border border-border-dim rounded-lg overflow-hidden bg-surface-muted/50 text-xs">
      {/* Header bar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface hover:bg-surface-hover text-text-muted transition-colors"
      >
        <span className="flex items-center gap-1.5 font-medium text-text-main">
          <Table2 size={13} className="text-accent-cyan" />
          <span>
            {table.length} Record{table.length !== 1 ? "s" : ""} Found
          </span>
        </span>
        <span className="text-text-muted">
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </span>
      </button>

      {/* Table Body */}
      {!collapsed && (
        <div className="overflow-x-auto max-h-56 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-dim bg-surface/80 text-[11px] text-text-muted uppercase tracking-wider">
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 font-semibold whitespace-nowrap">
                    {col.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dim/50">
              {table.map((row, i) => (
                <tr key={i} className="hover:bg-surface-hover/60 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-1.5 whitespace-nowrap text-text-main font-mono text-[11px]"
                      title={String(row[col] ?? "")}
                    >
                      {formatCellValue(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

