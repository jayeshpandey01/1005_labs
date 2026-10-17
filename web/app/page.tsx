"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { ChatInterface, ChatMessage } from "@/components/ChatInterface";
import { DatasetViewerModal } from "@/components/DatasetViewerModal";
import { AchievedMetricsModal } from "@/components/AchievedMetricsModal";
import { RouteMapsModal } from "@/components/RouteMapsModal";
import { PinnedBoardModal } from "@/components/PinnedBoardModal";
import { BarChartData } from "@/lib/rag/chart-types";
import { Database, Network, ShieldCheck, Zap, FolderDown, Trophy, Map, Pin } from "lucide-react";

// Dynamically import GraphView with ssr: false to prevent Cytoscape SSR issues
const GraphView = dynamic(
  () => import("@/components/GraphView").then((mod) => mod.GraphView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-500 font-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span>Initializing visual graph canvas...</span>
        </div>
      </div>
    ),
  }
);

export default function DashboardPage() {
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({
    nodes: [],
    edges: [],
  });
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChart, setActiveChart] = useState<BarChartData | undefined>(undefined);
  const [pinnedCards, setPinnedCards] = useState<BarChartData[]>([]);
  const [isPinnedBoardOpen, setIsPinnedBoardOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState(false);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [isMapsModalOpen, setIsMapsModalOpen] = useState(false);
  const [metadata, setMetadata] = useState<{ node_count: number; edge_count: number }>({
    node_count: 1134,
    edge_count: 1913,
  });

  const handlePinCard = (card: BarChartData) => {
    setPinnedCards((prev) => {
      const exists = prev.some((c) => c.id === card.id);
      if (exists) {
        return prev.filter((c) => c.id !== card.id);
      }
      return [...prev, card];
    });
  };

  const handleUnpinCard = (cardId: string) => {
    setPinnedCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  // Load initial metadata and baseline graph on mount
  useEffect(() => {
    // 1. Fetch metadata
    fetch("/api/graph/metadata")
      .then((res) => res.json())
      .then((data) => {
        if (data.node_count) {
          setMetadata({ node_count: data.node_count, edge_count: data.edge_count });
        }
      })
      .catch((err) => console.warn("Failed to load metadata:", err));

    // 2. Fetch baseline itinerary (SO-A on 2026-11-02)
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Show SO-A beat schedule on Nov 2" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.graph && data.graph.nodes?.length > 0) {
          setGraphData(data.graph);
        }
        if (data.chart) {
          setActiveChart(data.chart);
        }

        // Set initial onboarding message
        setMessages([
          {
            id: "initial-welcome",
            role: "assistant",
            content:
              "**Welcome to the PJP Sales Optimization Copilot**\n\nI have loaded the **November 2, 2026 baseline itinerary for Officer SO-A** on the visual graph to your left (6 focus stops with TSP travel times and reasons).\n\nUse the quick-action chips above or ask any question to inspect territory beat plans, CUSUM drop alerts, parent-child commercial hierarchies, or WhatsApp incentive nudges.",
            cypher: data.cypher,
            table: data.table,
            tree: data.tree,
            graph: data.graph,
            chart: data.chart,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      })
      .catch((err) => console.warn("Failed to load initial graph:", err));
  }, []);

  // Handle Query Submission from Chat
  const handleSendMessage = useCallback(
    async (userQuery: string) => {
      const userMsgId = `user-${Date.now()}`;
      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      // Add user message immediately
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          role: "user",
          content: userQuery,
          timestamp: nowStr,
        },
      ]);

      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: userQuery }),
        });

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }

        const data = await res.json();

        // If subgraph returned, merge/update graph canvas
        if (data.graph && data.graph.nodes?.length > 0) {
          setGraphData(data.graph);
          setHighlightedNodeIds(data.graph.nodes.map((n: any) => n.id));
        }

        // Update active chart for full canvas view
        if (data.chart) {
          setActiveChart(data.chart);
        }

        // Add assistant message
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.response || "No response generated.",
            cypher: data.cypher,
            table: data.table,
            tree: data.tree,
            graph: data.graph,
            chart: data.chart,
            intent: data.intent,
            source: data.source,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } catch (err: any) {
        console.error("Chat error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: `**Error executing query**: ${err.message || String(err)}. Please try another question.`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Focus on Subgraph from Assistant Turn
  const handleFocusGraph = (subgraph: { nodes: any[]; edges: any[] }) => {
    if (subgraph && subgraph.nodes.length > 0) {
      setGraphData(subgraph);
      setHighlightedNodeIds(subgraph.nodes.map((n) => n.id));
    }
  };

  // Reset Graph to Baseline
  const handleResetGraph = () => {
    handleSendMessage("Show SO-A beat schedule on Nov 2");
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-canvas">
      {/* Top System Header Bar */}
      <header className="h-12 border-b border-border-dim bg-surface/90 px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Network size={16} />
            </div>
            <div>
              <h1 className="font-bold text-xs tracking-wider uppercase text-text-main">
                PJP-GraphRAG
              </h1>
              <p className="text-[10px] text-text-muted">Permanent Journey Plan Copilot</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 ml-4">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-400 font-mono">
              <Database size={11} /> {metadata.node_count.toLocaleString()} Nodes
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-mono">
              <Zap size={11} /> {metadata.edge_count.toLocaleString()} Edges
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400">
              <ShieldCheck size={11} /> Read-Only Audited
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Executive Pinned Board Button */}
          <button
            onClick={() => setIsPinnedBoardOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-[11px] text-blue-300 font-mono transition-all shadow-sm font-semibold group"
            title="Open Executive Pinned Board with bookmarked bar cards"
          >
            <Pin size={12} className="text-blue-400 group-hover:scale-110 transition-transform fill-blue-400" />
            <span className="hidden sm:inline">My Board</span>
            {pinnedCards.length > 0 && (
              <span className="bg-blue-500/30 text-blue-200 px-1.5 py-0.2 rounded-full text-[10px]">
                {pinnedCards.length}
              </span>
            )}
          </button>

          {/* Territory Route Maps Viewer Button */}
          <button
            onClick={() => setIsMapsModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-elevated hover:bg-surface border border-border-dim hover:border-cyan-500/40 text-[11px] text-text-main font-mono transition-colors shadow-sm"
            title="View geographic territory route maps for SO-A, SO-B, and SO-C"
          >
            <Map size={12} className="text-cyan-400" />
            <span className="hidden sm:inline">Territory Maps</span>
          </button>

          {/* Achieved Metrics & Benchmark Scorecard Section Table Button */}
          <button
            onClick={() => setIsMetricsModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] text-amber-300 font-mono transition-all shadow-sm font-semibold group"
            title="Open simulation scorecard table of achieved performance metrics"
          >
            <Trophy size={13} className="text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Achieved Results</span>
            <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded text-[10px]">93.5%</span>
          </button>

          {/* Previous DB (CSV Files) & Simulation Results Viewer Button */}
          <button
            onClick={() => setIsDatasetModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-elevated hover:bg-surface border border-border-dim hover:border-cyan-500/40 text-[11px] text-text-main font-mono transition-colors shadow-sm"
            title="Inspect and download raw underlying CSV database tables & simulation outputs"
          >
            <FolderDown size={12} className="text-cyan-400" />
            <span>Raw DB & Results</span>
          </button>

          <span className="text-[11px] text-text-muted font-mono bg-canvas px-2 py-1 rounded border border-border-dim/60 hidden xl:inline">
            November 2026 Engine
          </span>
        </div>
      </header>

      {/* Main Split-Screen Workspace: 70% Graph Canvas | 30% Chat Section */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Pane: Visual Cytoscape Graph Canvas / Bar Graph View (70%) */}
        <section className="flex-1 md:w-[70%] h-1/2 md:h-full relative overflow-hidden border-r border-border-dim">
          <GraphView
            graphData={graphData}
            activeChart={activeChart}
            highlightedNodeIds={highlightedNodeIds}
            onAskCopilot={handleSendMessage}
            onResetGraph={handleResetGraph}
            onPinCard={handlePinCard}
            isPinned={activeChart ? pinnedCards.some((c) => c.id === activeChart.id) : false}
          />
        </section>

        {/* Right Pane: Conversational Assistant & Multi-Modal Results (30%) */}
        <section className="w-full md:w-[30%] md:min-w-[340px] h-1/2 md:h-full relative overflow-hidden flex flex-col">
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onFocusGraph={handleFocusGraph}
            onClearChat={() => setMessages([])}
            onPinCard={handlePinCard}
            pinnedCardIds={pinnedCards.map((c) => c.id)}
          />
        </section>
      </main>

      {/* Executive Pinned Board Modal */}
      <PinnedBoardModal
        isOpen={isPinnedBoardOpen}
        onClose={() => setIsPinnedBoardOpen(false)}
        pinnedCards={pinnedCards}
        onUnpinCard={handleUnpinCard}
        onAskCopilot={handleSendMessage}
      />

      {/* Raw DB CSV Dataset & Simulation Results Modal */}
      <DatasetViewerModal
        isOpen={isDatasetModalOpen}
        onClose={() => setIsDatasetModalOpen(false)}
      />

      {/* Achieved Simulation Metrics Scorecard Table Modal */}
      <AchievedMetricsModal
        isOpen={isMetricsModalOpen}
        onClose={() => setIsMetricsModalOpen(false)}
        onSelectQuery={handleSendMessage}
      />

      {/* Geographic Territory Route Maps Modal */}
      <RouteMapsModal
        isOpen={isMapsModalOpen}
        onClose={() => setIsMapsModalOpen(false)}
        onSelectQuery={handleSendMessage}
      />
    </div>
  );
}

