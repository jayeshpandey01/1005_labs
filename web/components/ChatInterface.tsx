"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Terminal,
  Table2,
  GitBranch,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { ResultTable } from "./ResultTable";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { BarChartCard } from "./BarChartCard";
import { BarChartData } from "@/lib/rag/chart-types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  cypher?: string;
  table?: Record<string, any>[];
  tree?: string;
  graph?: { nodes: any[]; edges: any[] };
  chart?: BarChartData;
  intent?: string;
  source?: string;
  timestamp: string;
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (query: string) => void;
  onFocusGraph?: (subgraph: { nodes: any[]; edges: any[] }) => void;
  onClearChat?: () => void;
  onPinCard?: (card: BarChartData) => void;
  pinnedCardIds?: string[];
}

const PROMPT_CHIPS = [
  "Show SO-A beat schedule on Nov 2",
  "Why was A-D004 visited on Nov 2?",
  "Show parent A-D019 commercial hierarchy",
  "Which dealers experienced a sales drop?",
  "Show WhatsApp nudges sent to dealers",
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onFocusGraph,
  onClearChat,
  onPinCard,
  pinnedCardIds = [],
}) => {
  const [inputText, setInputText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCypher, setExpandedCypher] = useState<Record<string, boolean>>({});
  const [expandedTree, setExpandedTree] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleCypher = (msgId: string) => {
    setExpandedCypher((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const toggleTree = (msgId: string) => {
    setExpandedTree((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border-dim text-text-main text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-dim bg-surface/90 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Sparkles size={15} />
          </div>
          <div>
            <h2 className="font-semibold text-text-main text-sm">PJP Sales Copilot</h2>
            <p className="text-[10px] text-text-muted flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              GraphRAG Active • Claude 3.5 Sonnet
            </p>
          </div>
        </div>

        {onClearChat && (
          <button
            onClick={onClearChat}
            className="text-[11px] text-text-muted hover:text-text-main hover:bg-surface-hover px-2.5 py-1 rounded transition-colors flex items-center gap-1"
          >
            <RefreshCw size={12} />
            <span>Reset Chat</span>
          </button>
        )}
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-3 py-2 border-b border-border-dim/60 bg-canvas/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {PROMPT_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(chip)}
            className="whitespace-nowrap px-2.5 py-1 rounded-full bg-surface-hover/70 hover:bg-surface-hover border border-border-dim text-[11px] text-text-muted hover:text-cyan-400 transition-colors shadow-sm"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            {/* Message Bubble */}
            <div
              className={`max-w-[90%] rounded-xl px-4 py-3 leading-relaxed shadow-md ${
                msg.role === "user"
                  ? "bg-accent-blue/15 text-blue-100 border border-blue-500/30 rounded-br-sm"
                  : "bg-surface-muted/90 text-text-main border border-border-dim rounded-bl-sm"
              }`}
            >
              {/* Formatted Content with True Markdown */}
              <div className="prose prose-invert prose-xs max-w-none text-xs">
                <MarkdownRenderer content={msg.content} />
              </div>

              {/* Executive Bar Graph Card */}
              {msg.role === "assistant" && msg.chart && (
                <div className="mt-3">
                  <BarChartCard
                    data={msg.chart}
                    onAskCopilot={onSendMessage}
                    onPinCard={onPinCard}
                    isPinned={pinnedCardIds.includes(msg.chart.id)}
                  />
                </div>
              )}

              {/* Sub-Components for Assistant Message */}
              {msg.role === "assistant" && (
                <div className="mt-3 pt-3 border-t border-border-dim/60 space-y-2">
                  {/* Collapsible Cypher Inspector */}
                  {msg.cypher && !msg.cypher.startsWith("--") && (
                    <div className="border border-border-dim rounded-lg overflow-hidden bg-black/40">
                      <div className="w-full flex items-center justify-between px-3 py-1.5 bg-surface/60 text-[11px] text-text-muted">
                        <button
                          type="button"
                          onClick={() => toggleCypher(msg.id)}
                          className="flex items-center gap-1.5 font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          <Terminal size={12} />
                          <span>Generated Cypher Query</span>
                          {expandedCypher[msg.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.cypher!, `cypher-${msg.id}`)}
                          className="hover:text-text-main p-1 rounded hover:bg-surface transition-colors"
                          title="Copy Cypher"
                        >
                          {copiedId === `cypher-${msg.id}` ? (
                            <Check size={12} className="text-emerald-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>

                      {expandedCypher[msg.id] && (
                        <pre className="p-3 font-mono text-[11px] text-emerald-300 overflow-x-auto bg-black/60 whitespace-pre">
                          {msg.cypher}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Tabular Records */}
                  {msg.table && msg.table.length > 0 && <ResultTable table={msg.table} />}

                  {/* Hierarchical Tree Inspector */}
                  {msg.tree && (
                    <div className="border border-border-dim rounded-lg overflow-hidden bg-black/40">
                      <div className="w-full flex items-center justify-between px-3 py-1.5 bg-surface/60 text-[11px] text-text-muted">
                        <button
                          type="button"
                          onClick={() => toggleTree(msg.id)}
                          className="flex items-center gap-1.5 font-mono text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          <GitBranch size={12} />
                          <span>Hierarchical Subgraph Tree</span>
                          {expandedTree[msg.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.tree!, `tree-${msg.id}`)}
                          className="hover:text-text-main p-1 rounded hover:bg-surface transition-colors"
                          title="Copy Tree"
                        >
                          {copiedId === `tree-${msg.id}` ? (
                            <Check size={12} className="text-emerald-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>

                      {expandedTree[msg.id] && (
                        <pre className="p-3 font-mono text-[11px] text-amber-200 overflow-x-auto bg-black/60 whitespace-pre">
                          {msg.tree}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Action Button: Focus on Visual Graph */}
                  {msg.graph && msg.graph.nodes.length > 0 && onFocusGraph && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => onFocusGraph(msg.graph!)}
                        className="flex items-center gap-1.5 py-1 px-2.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] font-medium transition-colors"
                      >
                        <ExternalLink size={12} />
                        <span>Focus Graph on {msg.graph.nodes.length} Elements</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Timestamp */}
            <span className="text-[9px] text-text-muted/60 mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-surface-muted/60 border border-border-dim rounded-xl max-w-[240px]">
            <Sparkles size={14} className="text-cyan-400 animate-spin" />
            <span className="text-xs text-text-muted">Traversing Knowledge Graph...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-border-dim bg-surface/90">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about itineraries, dealers, sales drops, nudges..."
            className="w-full bg-canvas border border-border-dim rounded-xl pl-3 pr-10 py-2.5 text-xs text-text-main placeholder-text-muted/60 focus:outline-none focus:border-cyan-500/50 resize-none transition-colors max-h-24 shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className={`absolute right-2 p-1.5 rounded-lg transition-colors ${
              inputText.trim() && !isLoading
                ? "bg-accent-cyan text-black hover:bg-cyan-400 shadow-md"
                : "text-text-muted/40 cursor-not-allowed"
            }`}
          >
            <Send size={14} />
          </button>
        </form>
        <p className="text-[10px] text-text-muted/50 text-center mt-1.5">
          Press Enter to send • Shift+Enter for newline
        </p>
      </div>
    </div>
  );
};

