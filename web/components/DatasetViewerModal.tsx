"use client";

import React, { useEffect, useState } from "react";
import { X, Download, FileText, Database, CheckCircle, Search } from "lucide-react";

interface DatasetFile {
  name: string;
  category: "master" | "pipeline" | "simulation" | "results";
  description: string;
  sizeBytes: number;
  rowCount: number;
  downloadUrl: string;
}

interface DatasetViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatasetViewerModal: React.FC<DatasetViewerModalProps> = ({ isOpen, onClose }) => {
  const [datasets, setDatasets] = useState<DatasetFile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch("/api/datasets")
        .then((res) => res.json())
        .then((data) => {
          if (data.files) setDatasets(data.files);
        })
        .catch((err) => console.error("Failed to load datasets:", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = datasets.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || d.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border-dim rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-dim flex items-center justify-between bg-surface-alt">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Database size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-main flex items-center gap-2">
                Underlying Database & Simulation Results
                <span className="text-[10px] font-mono font-normal bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  {datasets.length} Files Available
                </span>
              </h2>
              <p className="text-xs text-text-muted">
                Raw CSV source datasets, pipeline stages, and multi-seed simulation execution outputs
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

        {/* Filter & Search Bar */}
        <div className="px-5 py-3 border-b border-border-dim flex flex-wrap items-center justify-between gap-3 bg-surface/50">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search dataset, seed, or table name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-canvas border border-border-dim rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-main placeholder-text-muted focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {["all", "master", "pipeline", "simulation", "results"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono capitalize transition-colors ${
                  selectedCategory === cat
                    ? "bg-cyan-500 text-black font-semibold shadow-sm"
                    : "bg-surface-alt text-text-muted hover:text-text-main border border-border-dim"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* File Table */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted text-xs">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2" />
              Loading database tables & simulation results...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-text-muted text-xs">
              No matching files found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((file) => (
                <div
                  key={file.name}
                  className="p-3.5 rounded-lg border border-border-dim bg-surface-alt/70 hover:bg-surface-elevated/70 transition-colors flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-cyan-400 shrink-0" />
                        <span className="font-mono text-xs font-semibold text-text-main group-hover:text-cyan-400 transition-colors truncate max-w-[240px]">
                          {file.name}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border ${
                          file.category === "master"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : file.category === "pipeline"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : file.category === "simulation"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {file.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted line-clamp-2 mb-3">
                      {file.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border-dim/50 text-[10px] font-mono text-text-muted">
                    <div className="flex items-center gap-3">
                      <span>{file.rowCount.toLocaleString()} rows</span>
                      <span>{formatSize(file.sizeBytes)}</span>
                    </div>
                    <a
                      href={file.downloadUrl}
                      download={file.name.replace(/\//g, "_")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-colors"
                    >
                      <Download size={11} />
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-dim bg-surface-alt text-xs text-text-muted flex items-center justify-between font-mono">
          <div className="flex items-center gap-1.5">
            <CheckCircle size={13} className="text-emerald-400" />
            <span>All tables synchronized with Neo4j Knowledge Graph</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-surface-elevated hover:bg-surface border border-border-dim rounded text-text-main transition-colors text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

