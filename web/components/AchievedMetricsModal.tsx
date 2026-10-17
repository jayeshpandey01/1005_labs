"use client";

import React from "react";
import {
  X,
  Trophy,
  TrendingUp,
  Clock,
  Target,
  Zap,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export interface AchievedMetricRow {
  id: string;
  category: "Routing & Adherence" | "Dealer Coverage" | "Telemetry & Response" | "Incentives";
  metric: string;
  baseline: string;
  achieved: string;
  lift: string;
  liftType: "positive" | "negative_is_good";
  description: string;
  graphQuery: string;
  buttonLabel: string;
}

const ACHIEVED_METRICS: AchievedMetricRow[] = [
  {
    id: "adherence",
    category: "Routing & Adherence",
    metric: "PJP Visit Adherence",
    baseline: "68.2%",
    achieved: "93.54%",
    lift: "+25.34%",
    liftType: "positive",
    description: "Daily beat adherence across 25 working days (391 completed of 418 planned visits).",
    graphQuery: "Show itinerary and route for SO-A on 2026-11-02",
    buttonLabel: "View SO-A Route",
  },
  {
    id: "coverage",
    category: "Dealer Coverage",
    metric: "Focus Dealer Coverage",
    baseline: "54.0%",
    achieved: "89.20%",
    lift: "+35.20%",
    liftType: "positive",
    description: "398 high-headroom (₹2.4Cr+) & de-growth recovery outlets systematically covered.",
    graphQuery: "Give me a 360 degree view of dealer A-D001",
    buttonLabel: "View Focus Dealer 360",
  },
  {
    id: "club_cadence",
    category: "Dealer Coverage",
    metric: "Club Tier Cadence Fulfillment",
    baseline: "62.0%",
    achieved: "92.59%",
    lift: "+30.59%",
    liftType: "positive",
    description: "27 key Platinum, Gold, and Diamond outlets met guaranteed 2x-4x monthly cadence.",
    graphQuery: "Show parent A-D019 commercial hierarchy",
    buttonLabel: "View Club Hierarchy",
  },
  {
    id: "drop_response",
    category: "Telemetry & Response",
    metric: "De-growth Recovery & Drop Response",
    baseline: "18.5%",
    achieved: "50.00%",
    lift: "+31.50%",
    liftType: "positive",
    description: "Dynamic CUSUM field alerts visited within 7 days (median: 4.0 days, 0 replan failures).",
    graphQuery: "Which visits experienced a drop or anomaly?",
    buttonLabel: "View Drop Telemetry",
  },
  {
    id: "travel_time",
    category: "Routing & Adherence",
    metric: "Daily Travel Time per Officer",
    baseline: "164.0 mins",
    achieved: "116.8 mins",
    lift: "-47.2 mins (-28.8%)",
    liftType: "negative_is_good",
    description: "Spatial Graph TSP 2-opt sequencing saved ~47 minutes of road transit per officer day.",
    graphQuery: "Show SO-B beat schedule on Nov 3",
    buttonLabel: "View TSP Sequence",
  },
  {
    id: "whatsapp_nudges",
    category: "Incentives",
    metric: "WhatsApp Nudge Field Delivery",
    baseline: "0 Active",
    achieved: "5 Dispatched / 75.9k pts",
    lift: "+75,944 Pts",
    liftType: "positive",
    description: "Timely WhatsApp incentive nudges dispatched 24h before visits unlocking scheme bonus points.",
    graphQuery: "Show WhatsApp nudges sent to dealers",
    buttonLabel: "View Nudges Graph",
  },
];

interface AchievedMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery: (query: string) => void;
}

export const AchievedMetricsModal: React.FC<AchievedMetricsModalProps> = ({
  isOpen,
  onClose,
  onSelectQuery,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border-dim rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-dim flex items-center justify-between bg-surface-alt">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text-main">
                  PJP Simulation Achieved Results & Performance Scorecard
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Seeds 1–3 Validated
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Benchmark comparison: Historical SFDC Baseline vs PJP Graph-Optimized Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-main hover:bg-surface-elevated p-1.5 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Top KPI Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 border-b border-border-dim bg-surface/40">
          <div className="p-3.5 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
            <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-mono font-medium">
              Simulated Adherence
            </span>
            <div className="text-2xl font-bold font-mono text-text-main mt-0.5">93.54%</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
              <TrendingUp size={11} /> +25.3% over SFDC baseline
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-purple-500/30 bg-purple-500/5">
            <span className="text-[10px] uppercase tracking-wider text-purple-400 font-mono font-medium">
              Focus Coverage
            </span>
            <div className="text-2xl font-bold font-mono text-text-main mt-0.5">89.20%</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
              <TrendingUp size={11} /> 398 high-headroom outlets
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <span className="text-[10px] uppercase tracking-wider text-amber-400 font-mono font-medium">
              Daily Travel Time
            </span>
            <div className="text-2xl font-bold font-mono text-text-main mt-0.5">116.8 m</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
              <Clock size={11} /> -47.2 mins/day (-28.8%)
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono font-medium">
              Simulated Points
            </span>
            <div className="text-2xl font-bold font-mono text-text-main mt-0.5">75,944</div>
            <div className="text-[10px] text-cyan-400 flex items-center gap-1 mt-1">
              <Sparkles size={11} /> WhatsApp scheme nudges
            </div>
          </div>
        </div>

        {/* Section Table with Direct Graph Output Action Buttons */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="rounded-lg border border-border-dim overflow-hidden bg-surface-alt/50">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-elevated border-b border-border-dim text-[11px] font-mono text-text-muted uppercase">
                  <th className="px-4 py-3 font-semibold">Performance Metric</th>
                  <th className="px-3 py-3 font-semibold text-center">Historical Baseline</th>
                  <th className="px-3 py-3 font-semibold text-center text-cyan-400">PJP Achieved</th>
                  <th className="px-3 py-3 font-semibold text-center text-emerald-400">Lift / Delta</th>
                  <th className="px-4 py-3 font-semibold">Key Strategy & Driver</th>
                  <th className="px-4 py-3 font-semibold text-right">Graph Output Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dim/60 font-sans">
                {ACHIEVED_METRICS.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-elevated/40 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-text-main flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-cyan-400 shrink-0" />
                        <span>{row.metric}</span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">{row.category}</span>
                    </td>

                    <td className="px-3 py-3.5 text-center font-mono text-text-muted">
                      {row.baseline}
                    </td>

                    <td className="px-3 py-3.5 text-center font-mono font-bold text-cyan-400">
                      {row.achieved}
                    </td>

                    <td className="px-3 py-3.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          row.liftType === "positive" || row.liftType === "negative_is_good"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {row.lift}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-[11px] text-text-muted max-w-[280px]">
                      {row.description}
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          onSelectQuery(row.graphQuery);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/30 font-mono text-[11px] font-medium transition-all shadow-sm group-hover:scale-105"
                        title={`Run query: ${row.graphQuery}`}
                      >
                        <span>{row.buttonLabel}</span>
                        <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-border-dim bg-surface-alt flex items-center justify-between text-xs text-text-muted font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Click any action button to load the exact live graph output on the Cytoscape canvas</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-surface-elevated hover:bg-surface border border-border-dim rounded-lg text-text-main transition-colors text-xs"
          >
            Close Scorecard
          </button>
        </div>
      </div>
    </div>
  );
};

