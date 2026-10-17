"use client";

import React from "react";
import { X, Pin, Sparkles, Trash2, ArrowUpRight } from "lucide-react";
import { BarChartData } from "@/lib/rag/chart-types";
import { BarChartCard } from "./BarChartCard";

interface PinnedBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedCards: BarChartData[];
  onUnpinCard: (cardId: string) => void;
  onAskCopilot: (prompt: string) => void;
}

export const PinnedBoardModal: React.FC<PinnedBoardModalProps> = ({
  isOpen,
  onClose,
  pinnedCards,
  onUnpinCard,
  onAskCopilot,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-surface border border-border-dim rounded-2xl shadow-2xl overflow-hidden text-text-main">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-dim bg-surface/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Pin size={16} className="fill-blue-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-text-main flex items-center gap-2">
                <span>Executive Pinned Board</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-mono text-xs">
                  {pinnedCards.length} {pinnedCards.length === 1 ? "Card" : "Cards"}
                </span>
              </h2>
              <p className="text-xs text-text-muted">
                Saved analytical bar cards and comparative distributions for rapid executive review.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Board Content Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {pinnedCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-text-muted">
              <div className="w-12 h-12 rounded-full bg-surface-muted border border-border-dim flex items-center justify-center mb-3 text-text-muted/60">
                <Pin size={22} />
              </div>
              <h3 className="font-semibold text-sm text-text-main mb-1">No Pinned Cards Yet</h3>
              <p className="text-xs max-w-sm text-text-muted/80">
                Click <span className="font-mono text-blue-400">"PIN TO BOARD"</span> or{" "}
                <span className="font-mono text-blue-400">"Pinned to My board"</span> on any bar chart in the chat or canvas to bookmark it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pinnedCards.map((card) => (
                <div key={card.id} className="relative group">
                  <div className="absolute top-3 right-24 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onUnpinCard(card.id)}
                      title="Unpin Card"
                      className="p-1.5 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={12} />
                      <span>Remove</span>
                    </button>
                  </div>

                  <BarChartCard
                    data={card}
                    onAskCopilot={(p) => {
                      onAskCopilot(p);
                      onClose();
                    }}
                    onPinCard={() => onUnpinCard(card.id)}
                    isPinned={true}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-dim bg-surface/80 flex items-center justify-between text-xs text-text-muted">
          <span>Pinned cards are stored locally in your current workspace session.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface-hover hover:bg-border-dim text-text-main font-medium transition-colors"
          >
            Close Board
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinnedBoardModal;

