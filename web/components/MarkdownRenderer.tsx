"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  if (!content) return null;

  // Split into blocks by double newlines or code block fences
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = "";

  let inTable = false;
  let tableLines: string[] = [];

  let inList = false;
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(
        <ul key={`list-${blocks.length}`} className="my-2 space-y-1.5 pl-4 list-none">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-text-main leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0 inline-block select-none" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushTable = () => {
    if (tableLines.length > 0) {
      const rows = tableLines.map((line) =>
        line
          .split("|")
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      );

      if (rows.length >= 2) {
        const headers = rows[0];
        // rows[1] is the separator (---|---)
        const bodyRows = rows.slice(2);

        blocks.push(
          <div key={`table-${blocks.length}`} className="my-3 overflow-x-auto rounded-lg border border-border-dim bg-black/40">
            <table className="w-full text-left text-[11px] font-mono border-collapse">
              <thead>
                <tr className="bg-surface-elevated border-b border-border-dim text-cyan-400">
                  {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dim/50">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-surface-elevated/40 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-1.5 text-text-main">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableLines = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Code Block Fence (```)
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // End of code block
        blocks.push(
          <div key={`code-${blocks.length}`} className="my-2.5 rounded-lg border border-border-dim overflow-hidden bg-black/60 font-mono text-[11px]">
            {codeBlockLang && (
              <div className="px-3 py-1 bg-surface-elevated/80 border-b border-border-dim text-[10px] text-text-muted uppercase tracking-wider">
                {codeBlockLang}
              </div>
            )}
            <pre className="p-3 text-emerald-300 overflow-x-auto whitespace-pre">
              {codeBlockLines.join("\n")}
            </pre>
          </div>
        );
        codeBlockLines = [];
        inCodeBlock = false;
        codeBlockLang = "";
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeBlockLang = line.trim().replace(/^```/, "").trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // 2. Table row detection (| ... |)
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      flushList();
      inTable = true;
      tableLines.push(line.trim());
      continue;
    } else if (inTable) {
      flushTable();
    }

    // 3. Bullet list item (- or *)
    const listMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (listMatch) {
      flushTable();
      inList = true;
      listItems.push(listMatch[2]);
      continue;
    } else if (inList) {
      flushList();
    }

    // Empty line
    if (!line.trim()) {
      flushList();
      flushTable();
      continue;
    }

    // 4. Headings
    if (line.startsWith("### ")) {
      flushList();
      flushTable();
      blocks.push(
        <h3 key={`h3-${blocks.length}`} className="text-xs font-bold text-cyan-400 mt-3 mb-1 uppercase tracking-wider flex items-center gap-1.5">
          <span>{renderInline(line.replace("### ", ""))}</span>
        </h3>
      );
      continue;
    }

    if (line.startsWith("## ")) {
      flushList();
      flushTable();
      blocks.push(
        <h2 key={`h2-${blocks.length}`} className="text-sm font-bold text-text-main mt-3.5 mb-1.5 border-b border-border-dim pb-1">
          {renderInline(line.replace("## ", ""))}
        </h2>
      );
      continue;
    }

    if (line.startsWith("# ")) {
      flushList();
      flushTable();
      blocks.push(
        <h1 key={`h1-${blocks.length}`} className="text-base font-bold text-text-main mt-4 mb-2">
          {renderInline(line.replace("# ", ""))}
        </h1>
      );
      continue;
    }

    // 5. Blockquote (> ...)
    if (line.startsWith("> ")) {
      flushList();
      flushTable();
      blocks.push(
        <blockquote key={`quote-${blocks.length}`} className="my-2 pl-3 border-l-2 border-cyan-500/60 bg-cyan-500/5 py-1.5 pr-2 rounded-r text-[11px] text-text-muted italic">
          {renderInline(line.replace(/^>\s*/, ""))}
        </blockquote>
      );
      continue;
    }

    // 6. Regular paragraph
    blocks.push(
      <p key={`p-${blocks.length}`} className="my-1.5 text-text-main leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  flushList();
  flushTable();

  return <div className={`space-y-1 ${className}`}>{blocks}</div>;
};

/**
 * Render inline markdown styles: **bold**, *italic*, `code`, and links
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // Regex tokens: code, bold, italic, links
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Inline code: `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      const code = part.slice(1, -1);
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-black/50 border border-border-dim font-mono text-[10.5px] text-cyan-300 font-semibold"
        >
          {code}
        </code>
      );
    }

    // Bold: **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length > 3) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={idx} className="font-semibold text-text-main text-cyan-50/90">
          {renderInline(boldText)}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      const italicText = part.slice(1, -1);
      return (
        <em key={idx} className="italic text-text-muted">
          {renderInline(italicText)}
        </em>
      );
    }

    // Link: [title](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300 transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <span key={idx}>{part}</span>;
  });
}

