"use client";

import React from "react";
import { X, Network, MessageSquare, ExternalLink, MapPin, Award, DollarSign } from "lucide-react";

interface NodeInspectorProps {
  node: {
    id: string;
    label: string;
    properties: Record<string, any>;
  } | null;
  onClose: () => void;
  onExpandNeighbors: (nodeId: string) => void;
  onAskCopilot: (prompt: string) => void;
}

export const NodeInspectorModal: React.FC<NodeInspectorProps> = ({
  node,
  onClose,
  onExpandNeighbors,
  onAskCopilot,
}) => {
  if (!node) return null;

  const { id, label, properties = {} } = node;

  const getBadgeColor = (lbl: string) => {
    switch (lbl) {
      case "SalesOfficer":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "Dealer":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "Visit":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "DropEvent":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "Nudge":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  const formatPropVal = (val: any) => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "number") {
      if (val > 100000) return `₹${(val / 100000).toFixed(1)} Lakhs`;
      return val.toLocaleString();
    }
    return String(val);
  };

  return (
    <div className="absolute top-4 left-4 z-20 w-80 max-w-[calc(100vw-32px)] bg-surface/95 backdrop-blur-md border border-border-dim rounded-xl shadow-2xl p-4 text-xs text-text-main animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-border-dim">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${getBadgeColor(
                label
              )}`}
            >
              {label}
            </span>
            <span className="font-mono font-bold text-sm text-text-main">{id}</span>
          </div>
          <p className="text-[11px] text-text-muted truncate max-w-[200px]">
            {properties.name || properties.reason || properties.trigger_type || "Graph Entity"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-main p-1 rounded-md hover:bg-surface-hover transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Properties List */}
      <div className="py-3 max-h-60 overflow-y-auto space-y-2 pr-1">
        {properties.town && (
          <div className="flex items-center justify-between">
            <span className="text-text-muted flex items-center gap-1">
              <MapPin size={12} /> Town:
            </span>
            <span className="font-medium text-text-main">{properties.town}</span>
          </div>
        )}

        {properties.club_tier && (
          <div className="flex items-center justify-between">
            <span className="text-text-muted flex items-center gap-1">
              <Award size={12} /> Tier:
            </span>
            <span className="font-semibold text-amber-400">{properties.club_tier}</span>
          </div>
        )}

        {properties.headroom_inr !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-text-muted flex items-center gap-1">
              <DollarSign size={12} /> Headroom:
            </span>
            <span className="font-medium text-emerald-400">
              {formatPropVal(properties.headroom_inr)}
            </span>
          </div>
        )}

        {properties.degrowth_mom_inr !== undefined && Number(properties.degrowth_mom_inr) > 0 && (
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-rose-400/80">MoM De-growth:</span>
            <span className="font-semibold">{formatPropVal(properties.degrowth_mom_inr)}</span>
          </div>
        )}

        {properties.planned_arrival && (
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Arrival Window:</span>
            <span className="font-mono text-cyan-400 font-medium">
              {properties.planned_arrival}
            </span>
          </div>
        )}

        {properties.travel_min !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Travel From Prev:</span>
            <span className="font-mono">{properties.travel_min} mins</span>
          </div>
        )}

        {properties.message && (
          <div className="pt-2 border-t border-border-dim/50">
            <span className="text-purple-400 font-semibold block mb-1">WhatsApp Message:</span>
            <p className="bg-purple-950/20 border border-purple-500/20 p-2 rounded text-[11px] text-purple-200 leading-relaxed italic">
              "{properties.message}"
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-border-dim flex gap-2">
        <button
          onClick={() => onExpandNeighbors(id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-surface-hover hover:bg-border-dim text-text-main font-medium transition-colors"
        >
          <Network size={13} className="text-accent-cyan" />
          <span>Expand Neighbors</span>
        </button>

        <button
          onClick={() => {
            const prompt =
              label === "Dealer"
                ? `Tell me about dealer ${id} and why it is visited`
                : label === "SalesOfficer"
                ? `Show ${id} beat schedule on Nov 2`
                : `What is the operational context of ${id}?`;
            onAskCopilot(prompt);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-accent-cyan/15 hover:bg-accent-cyan/25 text-cyan-400 border border-cyan-500/30 font-medium transition-colors"
        >
          <MessageSquare size={13} />
          <span>Ask Copilot</span>
        </button>
      </div>
    </div>
  );
};

