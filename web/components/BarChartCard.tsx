"use client";

import React, { useState } from "react";
import { Sparkles, Check, Pin, MessageSquare, ArrowUpRight, Send, HelpCircle } from "lucide-react";
import { BarChartData, BarItem } from "@/lib/rag/chart-types";

interface BarChartCardProps {
  data: BarChartData;
  onAskCopilot?: (prompt: string) => void;
  onPinCard?: (card: BarChartData) => void;
  isPinned?: boolean;
  className?: string;
  isFullView?: boolean;
}

export const BarChartCard: React.FC<BarChartCardProps> = ({
  data,
  onAskCopilot,
  onPinCard,
  isPinned: initialPinned = false,
  className = "",
  isFullView = false,
}) => {
  const [isPinned, setIsPinned] = useState(initialPinned);
  const [justPinned, setJustPinned] = useState(false);
  const [activeChip, setActiveChip] = useState(data.activeFilterIndex || 0);
  const [hoveredBarId, setHoveredBarId] = useState<string | null>(null);
  const [inlineQuestion, setInlineQuestion] = useState("");
  const [clickedBarId, setClickedBarId] = useState<string | null>(null);

  const handlePin = () => {
    const nextState = !isPinned;
    setIsPinned(nextState);
    if (!isPinned) {
      setJustPinned(true);
      setTimeout(() => setJustPinned(false), 2000);
    }
    if (onPinCard) {
      onPinCard(data);
    }
  };

  /**
   * Generates a context-aware conversational prompt when a user clicks any bar
   */
  const handleBarClick = (bar: BarItem) => {
    setClickedBarId(bar.id);
    setTimeout(() => setClickedBarId(null), 1200);

    if (!onAskCopilot) return;

    const t = data.title.toLowerCase();
    const l = bar.label.toLowerCase();
    let prompt = "";

    // 1. Route Itinerary Stops
    if (l.startsWith("stop") || t.includes("travel time") || t.includes("itinerary") || t.includes("arrival") || t.includes("recovery") || t.includes("headroom")) {
      prompt = `Tell me more about ${bar.label} (${bar.sublabel || ""}) on this route: dealer details, metric ${bar.displayValue}, visit reason, and priority.`;
    }
    // 2. Sales Officers & Territory De-growth
    else if (bar.id === "SO-A" || bar.id === "SO-B" || bar.id === "SO-C" || l.includes("so-") || t.includes("territory") || t.includes("de-growth")) {
      prompt = `Why is territory ${bar.label} showing ${bar.displayValue} de-growth? Show its top de-growing dealers and recovery actions.`;
    }
    // 3. Loyalty Club Tiers
    else if (["silver", "gold", "platinum", "diamond", "elite", "non-club"].some((tier) => l.includes(tier)) || t.includes("loyalty") || t.includes("tier")) {
      prompt = `Show dealers in ${bar.label} tier with highest sales headroom (${bar.displayValue}) and expansion opportunities.`;
    }
    // 4. Commercial Hierarchy Outlets
    else if (t.includes("hierarchy") || bar.label.includes("Parent") || bar.label.includes("Subsidiary")) {
      prompt = `Detail the commercial hierarchy connection and turnover contribution of ${bar.label} (${bar.displayValue}).`;
    }
    // 5. Drop Anomaly Incidents
    else if (bar.id.startsWith("W") || t.includes("drop") || t.includes("anomaly")) {
      prompt = `Explain the CUSUM drop events in ${bar.label} (${bar.displayValue}). Which dealers experienced sudden volume drops?`;
    }
    // 6. WhatsApp Nudge Incentive Target Gaps
    else if (t.includes("nudge") || t.includes("incentive") || t.includes("points")) {
      prompt = `Explain WhatsApp incentive nudges for ${bar.label} (${bar.displayValue}). How many dealers are within reach of this slab?`;
    }
    // 7. Dealer 360 Metrics
    else if (t.includes("commercial account profile") || t.includes("dealer")) {
      prompt = `Analyze the ${bar.label} metric (${bar.displayValue}) in detail for this commercial dealer account.`;
    }
    // 8. General Fallback
    else {
      prompt = `Analyze ${bar.label} (${bar.displayValue}) in the context of ${data.title}.`;
    }

    onAskCopilot(prompt);
  };

  /**
   * Handles filter chip click follow-ups with exact semantic queries
   */
  const handleChipClick = (chipText: string, idx: number) => {
    setActiveChip(idx);
    if (!onAskCopilot) return;

    const chipLower = chipText.toLowerCase();

    // 1. Itinerary Specificity: 4 Key Mode Buttons
    if (chipLower === "travel per stop" || chipLower.includes("travel per stop") || chipLower.includes("travel breakdown")) {
      onAskCopilot("Show travel time breakdown per stop for SO-A on 2026-11-02");
    } else if (chipLower === "arrival schedule" || chipLower.includes("arrival schedule") || chipLower.includes("timeline")) {
      onAskCopilot("Show sequenced arrival schedule and stop timeline for SO-A on 2026-11-02");
    } else if (chipLower === "recovery stops" || chipLower.includes("recovery stops") || chipLower.includes("recovery alert")) {
      onAskCopilot("Show recovery stops and de-growth alerts for SO-A on 2026-11-02");
    } else if (chipLower === "wallet expansion" || chipLower.includes("wallet expansion") || chipLower.includes("headroom expansion")) {
      onAskCopilot("Show wallet headroom expansion opportunities for SO-A on 2026-11-02");
    }
    // 2. Cross-Table Territory & Dealer Follow-ups
    else if (chipLower.includes("silver expansion")) {
      onAskCopilot("Show Silver tier dealers with highest headroom expansion and growth recommendations.");
    } else if (chipLower.includes("top de-growing dealers")) {
      onAskCopilot("Which dealers have the highest MoM sales de-growth and need recovery visits?");
    } else if (chipLower.includes("cusum drop alerts") || chipLower.includes("drops by week")) {
      onAskCopilot("Which dealers experienced sudden sales drops or anomalies in November?");
    } else if (chipLower.includes("so-a beat plan") || chipLower.includes("so-b beat plan")) {
      onAskCopilot(`Show beat schedule and daily itinerary for ${chipText.slice(0, 4)} on Nov 2.`);
    } else if (chipLower.includes("parent a-d019 360")) {
      onAskCopilot("Show dealer 360 profile for parent outlet A-D019.");
    } else if (chipLower.includes("subsidiary a-d138 360")) {
      onAskCopilot("Show dealer 360 profile for subsidiary outlet A-D138.");
    } else if (chipLower.includes("dispatched messages") || chipLower.includes("gap by slab")) {
      onAskCopilot("Show WhatsApp incentive nudges sent to dealers with points needed.");
    } else {
      onAskCopilot(`${chipText} for ${data.title.toLowerCase()}`);
    }
  };

  /**
   * Handles inline question submission directly from inside the card
   */
  const handleInlineAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineQuestion.trim() || !onAskCopilot) return;
    onAskCopilot(inlineQuestion.trim());
    setInlineQuestion("");
  };

  // Compute maximum value for scaling heights
  const maxVal = Math.max(...data.bars.map((b) => b.value), 1);

  return (
    <div
      className={`rounded-2xl border border-border-dim bg-surface/95 backdrop-blur-md shadow-xl text-text-main overflow-hidden transition-all ${
        isFullView ? "p-6 max-w-4xl mx-auto" : "p-4 w-full"
      } ${className}`}
    >
      {/* 1. Header: AI Sparkle + Question + Actions */}
      <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-border-dim/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Sparkles size={14} className="text-accent-cyan" />
          </div>
          <h3 className="font-semibold text-xs sm:text-sm text-text-main tracking-tight line-clamp-2">
            {data.question}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onAskCopilot && (
            <button
              onClick={() => onAskCopilot(data.question)}
              className="px-2.5 py-1 text-[11px] font-mono rounded bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main border border-border-dim transition-colors"
            >
              ASK
            </button>
          )}

          <button
            onClick={handlePin}
            className={`flex items-center gap-1 px-3 py-1 text-[11px] font-mono font-medium rounded-md transition-colors ${
              isPinned
                ? "bg-blue-600 text-white shadow"
                : "bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
            }`}
          >
            <Pin size={11} className={isPinned ? "fill-white" : ""} />
            <span>{justPinned ? "SAVED TO BOARD!" : isPinned ? "PINNED" : "PIN TO BOARD"}</span>
          </button>
        </div>
      </div>

      {/* 2. Inset Card: The Interactive Bar Graph Visual Panel */}
      <div className="rounded-xl border border-border-dim/80 bg-canvas/60 p-4 sm:p-5 relative overflow-hidden">
        {/* Metric Header Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse" />
            <span className="font-mono text-[11px] tracking-wider uppercase text-text-muted font-medium">
              {data.title}
            </span>
          </div>

          <div className="text-right flex items-center gap-2">
            <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded inline-flex items-center gap-1.5">
              <MessageSquare size={10} className="text-cyan-400" />
              <span>Click any bar to chat</span>
            </span>
            <span className="font-mono font-bold text-xl sm:text-2xl text-text-main tracking-tight">
              {data.metricValue}
            </span>
          </div>
        </div>

        {/* Bar Chart Visualization with Click-to-Chat */}
        <div className="h-32 sm:h-36 flex items-end justify-between gap-3 sm:gap-6 px-2 sm:px-6 mb-4">
          {data.bars.map((bar) => {
            const heightPercent = Math.max(Math.round((bar.value / maxVal) * 100), 12);
            const isHovered = hoveredBarId === bar.id;
            const isClicked = clickedBarId === bar.id;

            return (
              <div
                key={bar.id}
                onMouseEnter={() => setHoveredBarId(bar.id)}
                onMouseLeave={() => setHoveredBarId(null)}
                onClick={() => handleBarClick(bar)}
                title={`Click to chat with Copilot about ${bar.label}`}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative select-none"
              >
                {/* Floating Tooltip with Click-to-Chat Callout */}
                {isHovered && (
                  <div className="absolute -top-14 z-30 bg-surface/95 backdrop-blur-md border border-cyan-500/40 px-3 py-1.5 rounded-lg shadow-2xl text-center pointer-events-none whitespace-nowrap animate-fadeIn">
                    <span className="font-mono font-bold text-xs text-text-main block">
                      {bar.displayValue}
                    </span>
                    {bar.percentage !== undefined && (
                      <span className="text-[10px] text-text-muted block">
                        {bar.percentage}% of total
                      </span>
                    )}
                    <span className="text-[10px] text-cyan-400 font-sans font-medium flex items-center justify-center gap-1 mt-0.5">
                      <MessageSquare size={10} />
                      Click to ask Copilot
                    </span>
                  </div>
                )}

                {/* Vertical Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full max-w-[70px] rounded-md transition-all duration-200 ease-out flex items-center justify-center relative ${
                    bar.isAlert
                      ? "bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/40 group-hover:shadow-rose-500/30"
                      : "bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-950/30 group-hover:shadow-blue-500/30"
                  } ${isHovered ? "scale-[1.04] ring-2 ring-cyan-400/60 ring-offset-1 ring-offset-canvas" : ""} ${
                    isClicked ? "scale-95 ring-2 ring-emerald-400" : ""
                  }`}
                >
                  <span className="text-[9px] font-mono text-white/90 font-medium px-1 truncate">
                    {bar.displayValue}
                  </span>
                </div>

                {/* Category Label Below Bar */}
                <div className="mt-2 text-center w-full">
                  <span
                    className={`block font-mono text-[11px] truncate transition-colors ${
                      bar.isAlert
                        ? "text-rose-400 font-semibold"
                        : "text-text-muted group-hover:text-cyan-300"
                    }`}
                  >
                    {bar.label}
                  </span>
                  {bar.sublabel && (
                    <span className="block text-[9px] text-text-muted/60 font-mono truncate">
                      {bar.sublabel}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Insight Annotation Row */}
        <div className="pt-3 border-t border-border-dim/40 flex items-start gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block mt-1 shrink-0" />
          <p className="text-xs text-text-main/90 font-mono leading-relaxed">
            {data.insight}
          </p>
        </div>
      </div>

      {/* 3. Action Footer Row: Pinned Indicator & Quick Filter Chips */}
      <div className="mt-3 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Pinned Checkbox / Toggle */}
        <button
          onClick={handlePin}
          className="flex items-center gap-2 text-[11px] font-medium text-text-muted hover:text-text-main transition-colors group"
        >
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${
              isPinned
                ? "bg-blue-600 border-blue-500 text-white"
                : "border-border-dim group-hover:border-blue-400 bg-surface"
            }`}
          >
            {isPinned && <Check size={10} strokeWidth={3} />}
          </div>
          <span className={isPinned ? "text-blue-300 font-semibold" : ""}>
            {justPinned ? "Saved to My Board!" : isPinned ? "Pinned to My board" : "Pin to My board"}
          </span>
        </button>

        {/* Quick Filter Follow-up Chips */}
        {data.filterChips && data.filterChips.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {data.filterChips.map((chip, idx) => {
              const isSelected = activeChip === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip, idx)}
                  className={`px-3 py-1 rounded-full text-[11px] font-mono transition-colors whitespace-nowrap border ${
                    isSelected
                      ? "bg-blue-500/15 border-blue-500/40 text-blue-300 font-medium"
                      : "bg-surface-hover/60 hover:bg-surface-hover border-border-dim text-text-muted hover:text-cyan-400"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Chat Through Bar Graph: Inline Query Box */}
      {onAskCopilot && (
        <div className="mt-3 pt-3 border-t border-border-dim/60">
          <form onSubmit={handleInlineAskSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <MessageSquare size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
              <input
                type="text"
                value={inlineQuestion}
                onChange={(e) => setInlineQuestion(e.target.value)}
                placeholder={`Ask Copilot about ${data.title.toLowerCase()} or click any bar above...`}
                className="w-full bg-canvas/80 border border-border-dim rounded-lg pl-9 pr-3 py-1.5 text-xs text-text-main placeholder-text-muted/60 focus:outline-none focus:border-cyan-500/60 transition-colors shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={!inlineQuestion.trim()}
              className="px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white transition-all shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <span>Ask Copilot</span>
              <ArrowUpRight size={13} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default BarChartCard;
