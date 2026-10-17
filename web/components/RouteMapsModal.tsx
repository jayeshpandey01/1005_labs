"use client";

import React, { useState } from "react";
import {
  X,
  MapPin,
  Compass,
  Download,
  ExternalLink,
  Navigation,
  ArrowRight,
  Maximize2,
  CheckCircle,
} from "lucide-react";

interface RouteMapsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery: (query: string) => void;
}

interface OfficerMapInfo {
  id: "SO-A" | "SO-B" | "SO-C";
  name: string;
  territory: string;
  geography: string;
  mapImage: string;
  headquarters: string;
  latLon: string;
  universeDealers: number;
  novemberVisits: number;
  avgTravelMins: string;
  sampleQuery: string;
  description: string;
}

const OFFICER_MAPS: OfficerMapInfo[] = [
  {
    id: "SO-A",
    name: "Sales Officer SO-A",
    territory: "Bengaluru North & East Outlets",
    geography: "Urban Commercial Metro",
    mapImage: "/maps/route_map_SO-A.png",
    headquarters: "Bengaluru Central HQ",
    latLon: "12.9716° N, 77.5946° E",
    universeDealers: 225,
    novemberVisits: 147,
    avgTravelMins: "116.8 mins / day",
    sampleQuery: "Show itinerary and route for SO-A on 2026-11-02",
    description:
      "Densely clustered urban electronics and commercial hardware dealers across Bengaluru North. Optimized via 2-opt TSP graph routing with 6 focus calls daily.",
  },
  {
    id: "SO-B",
    name: "Sales Officer SO-B",
    territory: "Bengaluru South & Peripheral Hubs",
    geography: "Suburban & Industrial Corridors",
    mapImage: "/maps/route_map_SO-B.png",
    headquarters: "Bengaluru South Hub",
    latLon: "12.9250° N, 77.5890° E",
    universeDealers: 227,
    novemberVisits: 145,
    avgTravelMins: "127.1 mins / day",
    sampleQuery: "Show SO-B beat schedule on Nov 3",
    description:
      "Extended suburban dealer beats spanning Electronic City and industrial suburbs. Sequential stops prioritized by CUSUM de-growth recovery and wallet share headroom.",
  },
  {
    id: "SO-C",
    name: "Sales Officer SO-C",
    territory: "Hubballi-Dharwad Commercial Zone",
    geography: "Tier-2 Regional Market",
    mapImage: "/maps/route_map_SO-C.png",
    headquarters: "Hubballi Central Depot",
    latLon: "15.3647° N, 75.1240° E",
    universeDealers: 225,
    novemberVisits: 126,
    avgTravelMins: "125.9 mins / day",
    sampleQuery: "Show SO-C beat schedule on Nov 4",
    description:
      "Hubballi and Dharwad regional hardware distribution network. High proportion of parent accounts with child commercial branches requiring strict 2x monthly club cadence.",
  },
];

export const RouteMapsModal: React.FC<RouteMapsModalProps> = ({
  isOpen,
  onClose,
  onSelectQuery,
}) => {
  const [selectedOfficer, setSelectedOfficer] = useState<"SO-A" | "SO-B" | "SO-C">("SO-A");
  const [imageError, setImageError] = useState(false);

  if (!isOpen) return null;

  const current = OFFICER_MAPS.find((m) => m.id === selectedOfficer) || OFFICER_MAPS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border-dim rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-dim flex items-center justify-between bg-surface-alt">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Compass size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text-main">
                  Geographic Route Maps & Territory TSP Paths
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold">
                  3 Sales Officers
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Spatial Graph TSP shortest path routes across Bengaluru & Hubballi field territories
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

        {/* Officer Selector Tabs */}
        <div className="px-6 py-2.5 border-b border-border-dim bg-surface/60 flex items-center gap-2">
          {OFFICER_MAPS.map((officer) => (
            <button
              key={officer.id}
              onClick={() => {
                setSelectedOfficer(officer.id);
                setImageError(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
                selectedOfficer === officer.id
                  ? "bg-cyan-500 text-black font-semibold shadow-md scale-[1.02]"
                  : "bg-surface-alt text-text-muted hover:text-text-main border border-border-dim"
              }`}
            >
              <Navigation size={13} className={selectedOfficer === officer.id ? "text-black" : "text-cyan-400"} />
              <span>{officer.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded ${selectedOfficer === officer.id ? "bg-black/20 text-black" : "bg-surface text-text-muted"}`}>
                {officer.universeDealers} Dealers
              </span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
          {/* Left: Map Preview Viewport */}
          <div className="flex-1 min-h-[380px] rounded-xl border border-border-dim overflow-hidden bg-black/60 relative flex items-center justify-center group shadow-inner">
            {!imageError ? (
              <img
                src={current.mapImage}
                alt={`${current.name} Route Map`}
                className="max-h-[500px] w-full object-contain p-2"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-text-muted text-xs">
                <MapPin size={32} className="text-cyan-400 mb-2 opacity-50" />
                <p className="font-mono mb-1">{current.mapImage}</p>
                <p className="text-[11px] text-text-muted/80">Map image ready in `public/maps/`</p>
              </div>
            )}

            {/* Quick Map Action Badge */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <a
                href={current.mapImage}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-surface/80 hover:bg-surface border border-border-dim text-cyan-400 shadow-md transition-colors"
                title="Open full resolution in new tab"
              >
                <Maximize2 size={14} />
              </a>
              <a
                href={current.mapImage}
                download={`route_map_${current.id}.png`}
                className="p-1.5 rounded-lg bg-surface/80 hover:bg-surface border border-border-dim text-text-main shadow-md transition-colors"
                title="Download high-res PNG map"
              >
                <Download size={14} />
              </a>
            </div>
          </div>

          {/* Right: Territory Intelligence & Stats Card */}
          <div className="w-full lg:w-[340px] flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-border-dim bg-surface-alt/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider font-mono text-cyan-400 font-semibold">
                    Territory Overview
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border-dim text-text-muted">
                    {current.geography}
                  </span>
                </div>

                <h3 className="text-base font-bold text-text-main">{current.territory}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{current.description}</p>
              </div>

              {/* Numerical Metrics */}
              <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                <div className="p-3 rounded-lg border border-border-dim bg-surface-alt/40">
                  <span className="text-[10px] text-text-muted">Universe Outlets</span>
                  <div className="text-base font-bold text-text-main mt-0.5">{current.universeDealers}</div>
                  <span className="text-[10px] text-cyan-400">100% Geo-coded</span>
                </div>

                <div className="p-3 rounded-lg border border-border-dim bg-surface-alt/40">
                  <span className="text-[10px] text-text-muted">November Visits</span>
                  <div className="text-base font-bold text-text-main mt-0.5">{current.novemberVisits}</div>
                  <span className="text-[10px] text-emerald-400">6 focus/day</span>
                </div>

                <div className="p-3 rounded-lg border border-border-dim bg-surface-alt/40">
                  <span className="text-[10px] text-text-muted">Avg Daily Travel</span>
                  <div className="text-base font-bold text-amber-400 mt-0.5">{current.avgTravelMins}</div>
                  <span className="text-[10px] text-emerald-400">2-opt TSP</span>
                </div>

                <div className="p-3 rounded-lg border border-border-dim bg-surface-alt/40">
                  <span className="text-[10px] text-text-muted">Headquarters</span>
                  <div className="text-xs font-semibold text-text-main mt-0.5 truncate">{current.headquarters}</div>
                  <span className="text-[9px] text-text-muted/70">{current.latLon}</span>
                </div>
              </div>
            </div>

            {/* Launch Visual Graph Action */}
            <div className="pt-2">
              <button
                onClick={() => {
                  onSelectQuery(current.sampleQuery);
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all font-mono hover:scale-[1.01]"
              >
                <span>Load {current.id} Beat Route on Graph</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-dim bg-surface-alt flex items-center justify-between text-xs text-text-muted font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle size={13} className="text-emerald-400" />
            <span>Maps synchronized with `docs/maps/route_map_*.png`</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-surface-elevated hover:bg-surface border border-border-dim rounded-lg text-text-main transition-colors text-xs"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};

