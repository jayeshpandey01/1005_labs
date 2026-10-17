"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import cytoscape, { Core, EventObject } from "cytoscape";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Search,
  Layers,
  Sparkles,
  ArrowRight,
  X,
  Compass,
  BarChart3,
  Network as NetworkIcon,
} from "lucide-react";
import { NodeInspectorModal } from "./NodeInspectorModal";
import { BarChartCard } from "./BarChartCard";
import { BarChartData } from "@/lib/rag/chart-types";

interface GraphViewProps {
  graphData: {
    nodes: any[];
    edges: any[];
  };
  activeChart?: BarChartData;
  highlightedNodeIds?: string[];
  onNodeSelect?: (node: any) => void;
  onAskCopilot?: (prompt: string) => void;
  onResetGraph?: () => void;
  onPinCard?: (card: BarChartData) => void;
  isPinned?: boolean;
}

type LayoutType = "breadthfirst" | "concentric" | "cose";
type ViewFormat = "network" | "barchart";

export const GraphView: React.FC<GraphViewProps> = ({
  graphData,
  activeChart,
  highlightedNodeIds = [],
  onNodeSelect,
  onAskCopilot,
  onResetGraph,
  onPinCard,
  isPinned = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const [viewFormat, setViewFormat] = useState<ViewFormat>("network");
  const [currentLayout, setCurrentLayout] = useState<LayoutType>("breadthfirst");
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Active analytical chart passed from GraphRAG
  const displayChart: BarChartData | undefined = activeChart;

  // Auto-detect optimal layout signature
  const detectBestLayout = (data: { nodes: any[]; edges: any[] }): LayoutType => {
    if (!data.nodes || data.nodes.length === 0) return "breadthfirst";
    const hasVisits = data.nodes.some((n) => n.label === "Visit");
    const hasOfficer = data.nodes.some((n) => n.label === "SalesOfficer");
    const dealers = data.nodes.filter((n) => n.label === "Dealer");

    // Route / Itinerary Flow -> Breadthfirst
    if (hasVisits && (hasOfficer || data.edges.some((e) => e.type === "NEXT_VISIT"))) {
      return "breadthfirst";
    }
    // Single Dealer 360 Star -> Concentric Radial
    if (dealers.length === 1 && data.nodes.length > 1) {
      return "concentric";
    }
    // Multi-dealer clusters or anomaly events -> CoSE Physics
    return "cose";
  };

  const getLayoutConfig = (layoutName: LayoutType, centralDealerId?: string) => {
    switch (layoutName) {
      case "concentric":
        return {
          name: "concentric",
          animate: true,
          animationDuration: 500,
          fit: true,
          padding: 60,
          concentric: (node: any) => {
            const data = node.data();
            if (data.label === "Dealer" && (!centralDealerId || data.id === centralDealerId)) return 3;
            if (data.label === "Dealer") return 2;
            if (data.label === "Visit" || data.label === "DropEvent" || data.label === "Nudge") return 2;
            return 1;
          },
          levelWidth: () => 1,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: true,
          minNodeSpacing: 65,
        };
      case "breadthfirst":
        return {
          name: "breadthfirst",
          animate: true,
          animationDuration: 500,
          fit: true,
          padding: 60,
          directed: true,
          spacingFactor: 1.6,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: true,
          roots: 'node[label = "SalesOfficer"]',
        };
      case "cose":
      default:
        return {
          name: "cose",
          animate: true,
          animationDuration: 500,
          fit: true,
          padding: 60,
          nodeOverlap: 20,
          componentSpacing: 100,
          nodeDimensionsIncludeLabels: true,
          idealEdgeLength: 95,
        };
    }
  };

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      style: [
        // Base Node Style
        {
          selector: "node",
          style: {
            label: "data(label_text)",
            color: "#f3f4f6",
            "font-size": "9px",
            "font-family": "ui-monospace, monospace",
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 7,
            "text-wrap": "wrap",
            "text-max-width": "80px",
            "background-color": "#4b5563",
            "border-width": 2,
            "border-color": "#374151",
            "transition-property": "background-color, border-color, border-width, width, height",
            "transition-duration": 0.2,
          },
        },
        // SalesOfficer
        {
          selector: 'node[label = "SalesOfficer"]',
          style: {
            shape: "hexagon",
            "background-color": "#06b6d4",
            "border-color": "#0891b2",
            "border-width": 3,
            width: 52,
            height: 52,
            "font-weight": "bold",
            "font-size": "11px",
          },
        },
        // Dealer Base
        {
          selector: 'node[label = "Dealer"]',
          style: {
            shape: "ellipse",
            "background-color": "#f59e0b",
            "border-color": "#d97706",
            "border-width": 2.5,
            width: 38,
            height: 38,
          },
        },
        // Dealer Loyalty Tier Halos
        {
          selector: 'node[label = "Dealer"][tier = "Platinum"]',
          style: {
            "border-color": "#c7d2fe",
            "border-width": 3.5,
            "background-color": "#6366f1",
          },
        },
        {
          selector: 'node[label = "Dealer"][tier = "Gold"]',
          style: {
            "border-color": "#fef08a",
            "border-width": 3,
            "background-color": "#f59e0b",
          },
        },
        {
          selector: 'node[label = "Dealer"][tier = "Silver"]',
          style: {
            "border-color": "#cbd5e1",
            "border-width": 2.5,
            "background-color": "#94a3b8",
          },
        },
        // Visit
        {
          selector: 'node[label = "Visit"]',
          style: {
            shape: "round-rectangle",
            "background-color": "#10b981",
            "border-color": "#059669",
            "border-width": 2,
            width: 34,
            height: 34,
          },
        },
        // DropEvent
        {
          selector: 'node[label = "DropEvent"]',
          style: {
            shape: "diamond",
            "background-color": "#f43f5e",
            "border-color": "#e11d48",
            "border-width": 3,
            width: 42,
            height: 42,
          },
        },
        // Nudge
        {
          selector: 'node[label = "Nudge"]',
          style: {
            shape: "round-rectangle",
            "background-color": "#a855f7",
            "border-color": "#9333ea",
            "border-width": 2,
            width: 32,
            height: 32,
          },
        },
        // Highlighted Nodes
        {
          selector: ".highlighted",
          style: {
            "border-color": "#38bdf8",
            "border-width": 5,
            "underlay-color": "#06b6d4",
            "underlay-padding": 8,
            "underlay-opacity": 0.55,
          },
        },
        // Base Edge Style
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#4b5563",
            "target-arrow-color": "#6b7280",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "arrow-scale": 0.8,
            label: "data(label)",
            "font-size": "8px",
            color: "#9ca3af",
            "text-rotation": "autorotate",
            "text-margin-y": -7,
            "text-background-opacity": 0.85,
            "text-background-color": "#0b0f19",
            "text-background-padding": "2px",
            "text-background-shape": "roundrectangle",
          },
        },
        // Sequential TSP Route Next Visit Edges
        {
          selector: 'edge[type = "NEXT_VISIT"]',
          style: {
            "line-color": "#10b981",
            "target-arrow-color": "#10b981",
            width: 3,
            "line-style": "dashed",
            color: "#34d399",
            "font-weight": "bold",
          },
        },
        // Visit to Dealer
        {
          selector: 'edge[type = "VISITS_DEALER"]',
          style: {
            "line-color": "#059669",
            "target-arrow-color": "#10b981",
            width: 2,
            opacity: 0.85,
          },
        },
        // Officer to Visit
        {
          selector: 'edge[type = "PERFORMS_VISIT"]',
          style: {
            "line-color": "#0891b2",
            "target-arrow-color": "#06b6d4",
            width: 2.5,
            opacity: 0.9,
          },
        },
        // Drop Anomaly Event
        {
          selector: 'edge[type = "EXPERIENCED_EVENT"]',
          style: {
            "line-color": "#e11d48",
            "target-arrow-color": "#f43f5e",
            width: 2.5,
          },
        },
        // WhatsApp Nudge
        {
          selector: 'edge[type = "DISPATCHED_TO"]',
          style: {
            "line-color": "#9333ea",
            "target-arrow-color": "#c084fc",
            width: 2,
            "line-style": "dashed",
          },
        },
        // Commercial Hierarchy
        {
          selector: 'edge[type = "SUBSIDIARY_OF"]',
          style: {
            "line-color": "#6366f1",
            "target-arrow-color": "#818cf8",
            width: 2,
            "line-style": "dotted",
          },
        },
        // Selected / Highlighted Edge
        {
          selector: "edge:selected",
          style: {
            width: 4,
            "line-color": "#38bdf8",
            "target-arrow-color": "#38bdf8",
            "arrow-scale": 1.2,
            "text-background-opacity": 1,
            "text-background-color": "#1e293b",
            color: "#38bdf8",
            "font-weight": "bold",
          },
        },
      ],
      layout: getLayoutConfig(currentLayout),
    });

    cyRef.current = cy;

    // Node Tap / Click Listener
    cy.on("tap", "node", (evt: EventObject) => {
      const node = evt.target;
      const nodeRaw = node.data("raw");
      setSelectedNode(nodeRaw);
      setSelectedEdge(null);
      if (onNodeSelect) onNodeSelect(nodeRaw);

      // Highlight tapped node
      cy.elements().removeClass("highlighted");
      node.addClass("highlighted");
    });

    // Edge Tap Listener
    cy.on("tap", "edge", (evt: EventObject) => {
      const edge = evt.target;
      const edgeRaw = edge.data("raw");
      setSelectedEdge(edgeRaw);
      setSelectedNode(null);
    });

    // Background tap unselects
    cy.on("tap", (evt: EventObject) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        setSelectedEdge(null);
        cy.elements().removeClass("highlighted");
      }
    });

    const handleResize = () => {
      cy.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  // Sync Graph Elements & Apply Adaptive Layout
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const elements: any[] = [];

    // Map Nodes
    (graphData.nodes || []).forEach((n) => {
      let labelText = n.id;
      if (n.label === "Visit") {
        labelText = `Stop ${n.properties?.sequence || ""}`;
      } else if (n.label === "Dealer") {
        labelText = n.id;
      } else if (n.label === "SalesOfficer") {
        labelText = n.id;
      } else if (n.label === "DropEvent") {
        labelText = `Drop #${n.properties?.visit_sequence || n.id.slice(-4)}`;
      } else if (n.label === "Nudge") {
        labelText = `Nudge #${n.id.replace("NUDGE_", "")}`;
      }

      elements.push({
        group: "nodes",
        data: {
          id: n.id,
          label: n.label,
          tier: n.properties?.club_tier || "Standard",
          label_text: labelText,
          raw: n,
        },
      });
    });

    // Map Edges
    (graphData.edges || []).forEach((e) => {
      let edgeLabel = "";
      if (e.type === "NEXT_VISIT") {
        edgeLabel = `${e.properties?.travel_min || ""}m`;
      } else if (e.type === "EXPERIENCED_EVENT") {
        edgeLabel = "drop";
      } else if (e.type === "DISPATCHED_TO") {
        edgeLabel = "nudge";
      } else if (e.type === "SUBSIDIARY_OF") {
        edgeLabel = "parent";
      } else if (e.type === "VISITS_DEALER" || e.type === "PERFORMS_VISIT") {
        edgeLabel = "";
      } else {
        edgeLabel = e.type.replace(/_/g, " ").toLowerCase();
      }

      elements.push({
        group: "edges",
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
          label: edgeLabel,
          raw: e,
        },
      });
    });

    // Replace elements atomically
    cy.elements().remove();
    cy.add(elements);

    // Auto-detect optimal layout
    const targetLayout = detectBestLayout(graphData);
    setCurrentLayout(targetLayout);

    const dealerNode = graphData.nodes?.find((n) => n.label === "Dealer");
    const layoutConfig = getLayoutConfig(targetLayout, dealerNode?.id);
    const layout = cy.layout(layoutConfig);
    layout.run();

    // Highlight any specified IDs
    if (highlightedNodeIds && highlightedNodeIds.length > 0) {
      highlightedNodeIds.forEach((id) => {
        cy.$(`node[id = "${id}"]`).addClass("highlighted");
      });
    }
  }, [graphData, highlightedNodeIds]);

  // Layout switcher
  const cycleLayout = useCallback(() => {
    const layoutCycle: LayoutType[] = ["breadthfirst", "concentric", "cose"];
    const currentIndex = layoutCycle.indexOf(currentLayout);
    const nextLayout = layoutCycle[(currentIndex + 1) % layoutCycle.length];
    setCurrentLayout(nextLayout);

    if (cyRef.current) {
      const dealerNode = graphData.nodes?.find((n) => n.label === "Dealer");
      const cfg = getLayoutConfig(nextLayout, dealerNode?.id);
      cyRef.current.layout(cfg).run();
    }
  }, [currentLayout, graphData]);

  // Controls
  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit(undefined, 50);

  // Search autocomplete
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.trim().length > 1) {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/graph/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setSearchResults(json.slice(0, 5));
      } catch {
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (node: any) => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setSelectedNode(node);

    const cy = cyRef.current;
    if (cy) {
      const cyNode = cy.$(`node[id = "${node.id}"]`);
      if (cyNode.length > 0) {
        cy.elements().removeClass("highlighted");
        cyNode.addClass("highlighted");
        cy.animate({
          center: { eles: cyNode },
          zoom: 1.5,
          duration: 500,
        });
      } else {
        expandNeighbors(node.id);
      }
    }
  };

  // 1-Hop Neighbor expansion
  const expandNeighbors = async (nodeId: string) => {
    try {
      const res = await fetch(`/api/graph/neighbors/${encodeURIComponent(nodeId)}`);
      if (!res.ok) return;
      const data = await res.json();

      const cy = cyRef.current;
      if (!cy) return;

      const newElements: any[] = [];
      (data.nodes || []).forEach((n: any) => {
        if (cy.$(`node[id = "${n.id}"]`).length === 0) {
          newElements.push({
            group: "nodes",
            data: {
              id: n.id,
              label: n.label,
              tier: n.properties?.club_tier || "Standard",
              label_text: n.properties?.name || n.id,
              raw: n,
            },
          });
        }
      });

      (data.edges || []).forEach((e: any) => {
        if (cy.$(`edge[id = "${e.id}"]`).length === 0) {
          newElements.push({
            group: "edges",
            data: {
              id: e.id,
              source: e.source,
              target: e.target,
              type: e.type,
              label: e.type.replace(/_/g, " ").toLowerCase(),
              raw: e,
            },
          });
        }
      });

      if (newElements.length > 0) {
        cy.add(newElements);
        const dealerNode = data.nodes?.find((n: any) => n.label === "Dealer");
        cy.layout(getLayoutConfig(currentLayout, dealerNode?.id)).run();
      }
    } catch (err) {
      console.error("Neighbor expansion error:", err);
    }
  };

  const getLayoutLabel = (layout: LayoutType) => {
    switch (layout) {
      case "breadthfirst":
        return "Route Flow";
      case "concentric":
        return "Radial Star";
      case "cose":
        return "Physics";
    }
  };

  return (
    <div className="relative w-full h-full bg-canvas select-none overflow-hidden">
      {/* Top Header / Search / Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        {/* Left: Search Bar */}
        <div className="relative w-72 pointer-events-auto">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search Dealer ID, Officer, Town..."
              className="w-full bg-surface/90 backdrop-blur border border-border-dim rounded-lg pl-9 pr-3 py-1.5 text-xs text-text-main placeholder-text-muted/60 focus:outline-none focus:border-cyan-500/50 transition-colors shadow-lg"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-dim rounded-lg shadow-2xl overflow-hidden z-30">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-surface-hover flex items-center justify-between border-b border-border-dim/40 last:border-0"
                >
                  <span className="font-mono font-medium text-cyan-400">{item.id}</span>
                  <span className="text-[10px] text-text-muted capitalize">
                    {item.label} {item.properties?.town ? `• ${item.properties.town}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Controls Toolbar */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Format Switcher: Network Graph vs Bar Graph */}
          <div className="flex items-center bg-surface/90 backdrop-blur border border-border-dim rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setViewFormat("network")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all font-medium ${
                viewFormat === "network"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-text-muted hover:text-text-main hover:bg-surface-hover"
              }`}
              title="Interactive Network Topology (Nodes & Directed Edges)"
            >
              <NetworkIcon size={13} />
              <span>Network Graph</span>
            </button>

            <button
              onClick={() => setViewFormat("barchart")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all font-medium ${
                viewFormat === "barchart"
                  ? "bg-blue-600/25 text-blue-300 border border-blue-500/40 shadow-sm"
                  : "text-text-muted hover:text-text-main hover:bg-surface-hover"
              }`}
              title="Executive Bar Graph Pattern (Comparative Distribution & Outliers)"
            >
              <BarChart3 size={13} />
              <span>Bar Graph</span>
            </button>
          </div>

          {/* Cytoscape Layout & Zoom Controls (Visible when in Network mode) */}
          {viewFormat === "network" && (
            <div className="flex items-center gap-1.5 bg-surface/90 backdrop-blur border border-border-dim rounded-lg p-1 shadow-lg">
              <button
                onClick={cycleLayout}
                title={`Current layout: ${getLayoutLabel(currentLayout)}. Click to cycle (Route Flow → Radial Star → Physics).`}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors font-medium border border-border-dim/50"
              >
                <Compass size={13} className="text-accent-cyan" />
                <span>{getLayoutLabel(currentLayout)}</span>
              </button>

              <div className="w-[1px] h-4 bg-border-dim" />

              <button
                onClick={handleZoomIn}
                title="Zoom In"
                className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface-hover rounded transition-colors"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={handleZoomOut}
                title="Zoom Out"
                className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface-hover rounded transition-colors"
              >
                <ZoomOut size={14} />
              </button>
              <button
                onClick={handleFit}
                title="Fit to View"
                className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface-hover rounded transition-colors"
              >
                <Maximize2 size={14} />
              </button>

              {onResetGraph && (
                <button
                  onClick={onResetGraph}
                  title="Reset Baseline Graph"
                  className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface-hover rounded transition-colors"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      {viewFormat === "barchart" ? (
        <div className="w-full h-full overflow-y-auto p-6 pt-20 flex flex-col items-center justify-start bg-canvas/90 animate-fadeIn">
          <div className="w-full max-w-3xl">
            {displayChart ? (
              <BarChartCard
                data={displayChart}
                onAskCopilot={onAskCopilot}
                onPinCard={onPinCard}
                isPinned={isPinned}
                isFullView={true}
              />
            ) : (
              <div className="p-8 text-center text-text-muted bg-surface rounded-2xl border border-border-dim">
                No active analytical chart for the current query.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Legend & Stats Overlay */}
          <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
            <div className="flex items-center gap-3 bg-surface/85 backdrop-blur border border-border-dim px-3 py-1.5 rounded-lg text-[10px] text-text-muted shadow-md pointer-events-auto">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-entity-officer inline-block" /> Officer
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-entity-dealer inline-block" /> Dealer
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-entity-visit inline-block" /> Visit
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rotate-45 bg-entity-event inline-block" /> Drop Event
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-entity-nudge inline-block" /> Nudge
              </span>
            </div>
          </div>

          {/* Selected Edge Details Tooltip */}
          {selectedEdge && (
            <div className="absolute bottom-3 right-3 z-20 bg-surface/95 backdrop-blur border border-cyan-500/40 rounded-lg p-3 shadow-xl max-w-xs text-xs text-text-main animate-fadeIn">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border-dim">
                <span className="font-mono font-bold text-cyan-400">[:{selectedEdge.type}]</span>
                <button
                  onClick={() => setSelectedEdge(null)}
                  className="text-text-muted hover:text-text-main p-0.5 rounded"
                >
                  <X size={13} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-text-muted mb-2">
                <span>{selectedEdge.source}</span>
                <ArrowRight size={11} className="text-cyan-400" />
                <span>{selectedEdge.target}</span>
              </div>
              {selectedEdge.properties && Object.keys(selectedEdge.properties).length > 0 && (
                <div className="space-y-1 text-[11px]">
                  {selectedEdge.properties.travel_min !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Travel Time:</span>
                      <span className="font-mono text-emerald-400">{selectedEdge.properties.travel_min} mins</span>
                    </div>
                  )}
                  {selectedEdge.properties.planned_arrival && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Arrival Window:</span>
                      <span className="font-mono text-cyan-400">{selectedEdge.properties.planned_arrival}</span>
                    </div>
                  )}
                  {selectedEdge.properties.reason && (
                    <div className="text-text-muted italic pt-1">
                      "{selectedEdge.properties.reason}"
                    </div>
                  )}
                  {selectedEdge.properties.trigger_type && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Trigger:</span>
                      <span className="font-medium text-purple-400">{selectedEdge.properties.trigger_type}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selected Node Details Drawer */}
          <NodeInspectorModal
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onExpandNeighbors={expandNeighbors}
            onAskCopilot={(prompt) => {
              if (onAskCopilot) onAskCopilot(prompt);
              setSelectedNode(null);
            }}
          />

          {/* Native Cytoscape Canvas Container */}
          <div ref={containerRef} className="w-full h-full" />
        </>
      )}
    </div>
  );
};

export default GraphView;
