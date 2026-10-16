#!/usr/bin/env python3
"""PJP-Graphify: Standalone Cytoscape.js Dark Dashboard Generator.

Emits an interactive, zero-dependency HTML dashboard inspired by
jayeshpandey01/Graph-Based-Query-System with live physics, node searching,
and edge explanation side-drawer inspection.
"""

import json
from pathlib import Path
from typing import Optional
import networkx as nx

from .graph_builder import load_pjp_knowledge_graph

BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUT = BASE_DIR / "pjp_graph_dashboard.html"


def export_cytoscape_html(
    graph: Optional[nx.MultiDiGraph] = None,
    out_path: Optional[Path] = None,
    max_nodes: int = 450,
) -> Path:
    """Generate standalone dark Cytoscape.js interactive graph dashboard."""
    g = graph if graph is not None else load_pjp_knowledge_graph()
    output_file = out_path or DEFAULT_OUT

    # Prepare Cytoscape elements (prioritize active/focus entities to keep canvas responsive)
    elements = []

    # Filter to high-value subgraph if graph is large
    included_nodes = set()
    for n, data in g.nodes(data=True):
        ntype = data.get("node_type", "")
        # Always include Officers, Base, Slabs, Nudges, Events, Calendar Days
        if ntype in ("Officer", "BaseDepot", "SchemeSlab", "WhatsAppNudge", "AnomalyEvent"):
            included_nodes.add(n)
        # Include dealers with focus visits or active events or club
        elif data.get("is_club") or data.get("is_active_for_events") or data.get("sales_rate_daily", 0) > 0.5:
            included_nodes.add(n)

    # If still below max_nodes, add more dealers
    if len(included_nodes) < max_nodes:
        for n in g.nodes():
            if len(included_nodes) >= max_nodes:
                break
            included_nodes.add(n)

    # 1. Format Nodes
    for n in included_nodes:
        data = g.nodes[n]
        ntype = data.get("node_type", "Dealer")
        label = data.get("label", n)

        # Assign color and shape based on entity type
        if ntype == "Officer":
            color = "#3B82F6"
            shape = "round-rectangle"
            size = 50
        elif ntype == "BaseDepot":
            color = "#1D4ED8"
            shape = "square"
            size = 40
        elif ntype == "Dealer" and data.get("is_club"):
            color = "#F59E0B"  # Gold
            shape = "hexagon"
            size = 35
        elif ntype == "Dealer":
            color = "#10B981"  # Emerald
            shape = "ellipse"
            size = 25
        elif ntype == "AnomalyEvent":
            color = "#EF4444"  # Crimson
            shape = "diamond"
            size = 35
        elif ntype == "SchemeSlab":
            color = "#8B5CF6"  # Violet
            shape = "octagon"
            size = 35
        elif ntype == "WhatsAppNudge":
            color = "#06B6D4"  # Cyan
            shape = "tag"
            size = 30
        elif ntype == "CalendarDay":
            color = "#64748B"  # Slate
            shape = "round-rectangle"
            size = 30
        else:
            color = "#94A3B8"
            shape = "ellipse"
            size = 25

        elements.append({
            "group": "nodes",
            "data": {
                "id": n,
                "label": label,
                "type": ntype,
                "color": color,
                "shape": shape,
                "size": size,
                "properties": {k: v for k, v in data.items() if k not in ("color", "shape", "size")},
            },
        })

    # 2. Format Edges
    for u, v, key, edata in g.edges(keys=True, data=True):
        if u in included_nodes and v in included_nodes:
            etype = edata.get("edge_type", "RELATED_TO")
            expl = edata.get("explanation", "")

            # Color by relationship
            if etype == "TOUR_LEG":
                edge_color = "#38BDF8"
                line_style = "solid"
                width = 2
            elif etype == "SCHEDULED_ON":
                edge_color = "#10B981"
                line_style = "dashed"
                width = 1.5
            elif etype in ("SUBSIDIARY_OF", "PARENT_OF"):
                edge_color = "#F59E0B"
                line_style = "dotted"
                width = 2
            elif etype == "SUFFERED_EVENT":
                edge_color = "#EF4444"
                line_style = "solid"
                width = 2.5
            elif etype == "TARGETS_SLAB":
                edge_color = "#8B5CF6"
                line_style = "dashed"
                width = 1.5
            elif etype == "HAS_NUDGE":
                edge_color = "#06B6D4"
                line_style = "dotted"
                width = 2
            else:
                edge_color = "#64748B"
                line_style = "solid"
                width = 1

            elements.append({
                "group": "edges",
                "data": {
                    "id": f"{u}_{v}_{key}",
                    "source": u,
                    "target": v,
                    "type": etype,
                    "color": edge_color,
                    "style": line_style,
                    "width": width,
                    "explanation": expl,
                    "properties": edata,
                },
            })

    elements_json = json.dumps(elements)

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PJP-Graphify: Permanent Journey Plan Knowledge Graph Explorer</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js"></script>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }}
    body {{ background: #0b0f19; color: #f1f5f9; display: flex; height: 100vh; overflow: hidden; }}
    #sidebar {{ width: 340px; background: #0f172a; border-right: 1px solid #1e293b; display: flex; flex-direction: column; padding: 18px; z-index: 10; }}
    #header h1 {{ font-size: 16px; font-weight: 700; color: #38bdf8; letter-spacing: 0.5px; margin-bottom: 4px; }}
    #header p {{ font-size: 11px; color: #94a3b8; margin-bottom: 14px; line-height: 1.4; }}
    #search {{ width: 100%; padding: 8px 12px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #f8fafc; font-size: 12px; margin-bottom: 12px; outline: none; }}
    #search:focus {{ border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2); }}
    .section-title {{ font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin: 10px 0 6px 0; letter-spacing: 0.5px; }}
    .pills {{ display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }}
    .pill {{ padding: 4px 8px; font-size: 11px; border-radius: 12px; cursor: pointer; border: 1px solid #334155; background: #1e293b; color: #cbd5e1; user-select: none; transition: all 0.15s; }}
    .pill:hover {{ background: #334155; color: #fff; }}
    .pill.active {{ background: #0284c7; border-color: #38bdf8; color: #fff; font-weight: 600; }}
    #inspector {{ flex: 1; overflow-y: auto; background: #1e293b; border-radius: 8px; padding: 12px; border: 1px solid #334155; }}
    #inspector h2 {{ font-size: 13px; font-weight: 700; color: #38bdf8; margin-bottom: 6px; }}
    #inspector p {{ font-size: 11px; color: #cbd5e1; line-height: 1.4; margin-bottom: 8px; }}
    .prop-row {{ font-size: 11px; display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #334155; }}
    .prop-key {{ color: #94a3b8; font-weight: 500; }}
    .prop-val {{ color: #f8fafc; font-weight: 600; text-align: right; max-width: 60%; word-break: break-all; }}
    .badge {{ display: inline-block; padding: 2px 6px; font-size: 10px; border-radius: 4px; font-weight: bold; margin-bottom: 6px; }}
    #canvas-container {{ flex: 1; position: relative; }}
    #cy {{ width: 100%; height: 100%; }}
    #controls {{ position: absolute; bottom: 18px; right: 18px; display: flex; gap: 8px; z-index: 10; }}
    .btn {{ padding: 6px 12px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #f8fafc; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; }}
    .btn:hover {{ background: #334155; border-color: #38bdf8; }}
  </style>
</head>
<body>
  <div id="sidebar">
    <div id="header">
      <h1>PJP-Graphify Explorer</h1>
      <p>Deterministic AST & Multi-Relational Knowledge Graph with Explained Edges</p>
    </div>
    <input type="text" id="search" placeholder="Search Dealer (e.g. A-D004), SO, Date..." />
    <div class="section-title">Filter by Entity Type</div>
    <div class="pills">
      <div class="pill active" data-type="all">All</div>
      <div class="pill" data-type="Officer">Officers</div>
      <div class="pill" data-type="Dealer">Dealers</div>
      <div class="pill" data-type="AnomalyEvent">Drops / Hikes</div>
      <div class="pill" data-type="SchemeSlab">Slabs</div>
      <div class="pill" data-type="WhatsAppNudge">Nudges</div>
    </div>
    <div class="section-title">Graph Entity & Edge Inspector</div>
    <div id="inspector">
      <p style="color:#64748b; font-style: italic;">Click any node or edge to inspect its mathematical properties and plain-English operational reasoning.</p>
    </div>
  </div>

  <div id="canvas-container">
    <div id="cy"></div>
    <div id="controls">
      <button class="btn" id="btn-cose">Physics Layout (CoSE)</button>
      <button class="btn" id="btn-concentric">Concentric Layout</button>
      <button class="btn" id="btn-reset">Reset View</button>
    </div>
  </div>

  <script>
    const elements = {elements_json};

    const cy = cytoscape({{
      container: document.getElementById('cy'),
      elements: elements,
      style: [
        {{
          selector: 'node',
          style: {{
            'background-color': 'data(color)',
            'label': 'data(label)',
            'color': '#f8fafc',
            'font-size': '10px',
            'font-weight': '600',
            'text-valign': 'bottom',
            'text-margin-y': '4px',
            'shape': 'data(shape)',
            'width': 'data(size)',
            'height': 'data(size)',
            'border-width': 1.5,
            'border-color': '#0f172a'
          }}
        }},
        {{
          selector: 'edge',
          style: {{
            'width': 'data(width)',
            'line-color': 'data(color)',
            'target-arrow-color': 'data(color)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'line-style': 'data(style)',
            'opacity': 0.7
          }}
        }},
        {{
          selector: ':selected',
          style: {{
            'border-width': 3,
            'border-color': '#38bdf8',
            'line-color': '#38bdf8',
            'target-arrow-color': '#38bdf8',
            'opacity': 1.0
          }}
        }}
      ],
      layout: {{
        name: 'cose',
        animate: true,
        randomize: false,
        componentSpacing: 100,
        nodeOverlap: 20,
        idealEdgeLength: 60,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 400
      }}
    }});

    // Inspector Rendering
    const inspector = document.getElementById('inspector');

    cy.on('tap', 'node', function(evt) {{
      const node = evt.target;
      const data = node.data();
      const props = data.properties || {{}};

      let html = `<span class="badge" style="background:${{data.color}};">${{data.type}}</span>`;
      html += `<h2>${{data.label}}</h2>`;
      html += `<p style="font-size:10px; color:#94a3b8;">Node ID: ${{data.id}}</p>`;

      html += `<div style="margin-top:10px;">`;
      for (const [k, v] of Object.entries(props)) {{
        if (typeof v === 'object' && v !== null) continue;
        html += `<div class="prop-row"><span class="prop-key">${{k}}</span><span class="prop-val">${{v}}</span></div>`;
      }}
      html += `</div>`;
      inspector.innerHTML = html;
    }});

    cy.on('tap', 'edge', function(evt) {{
      const edge = evt.target;
      const data = edge.data();
      const props = data.properties || {{}};

      let html = `<span class="badge" style="background:${{data.color}};">Edge: ${{data.type}}</span>`;
      html += `<h2 style="font-size:12px; color:#f8fafc;">${{data.source}} &rarr; ${{data.target}}</h2>`;
      html += `<div style="background:#0f172a; padding:8px; border-radius:6px; margin:8px 0; border:1px solid #334155;">`;
      html += `<span style="font-size:10px; color:#38bdf8; font-weight:700; text-transform:uppercase;">Every Edge Explained:</span>`;
      html += `<p style="font-size:11px; color:#e2e8f0; margin-top:4px; line-height:1.4;">${{data.explanation || 'Direct relational edge.'}}</p>`;
      html += `</div>`;

      html += `<div style="margin-top:10px;">`;
      for (const [k, v] of Object.entries(props)) {{
        if (k === 'explanation' || typeof v === 'object') continue;
        html += `<div class="prop-row"><span class="prop-key">${{k}}</span><span class="prop-val">${{v}}</span></div>`;
      }}
      html += `</div>`;
      inspector.innerHTML = html;
    }});

    // Search Box
    document.getElementById('search').addEventListener('input', function(e) {{
      const query = e.target.value.trim().toLowerCase();
      if (!query) {{
        cy.elements().style('opacity', 0.8);
        return;
      }}
      cy.elements().style('opacity', 0.1);
      const matched = cy.nodes().filter(function(ele) {{
        const label = (ele.data('label') || '').toLowerCase();
        const id = ele.data('id').toLowerCase();
        return label.includes(query) || id.includes(query);
      }});
      matched.style('opacity', 1.0);
      matched.neighborhood().style('opacity', 0.7);
      if (matched.length > 0) {{
        cy.animate({{ center: {{ eles: matched }}, zoom: 1.2, duration: 300 }});
      }}
    }});

    // Pills Filter
    document.querySelectorAll('.pill').forEach(pill => {{
      pill.addEventListener('click', function() {{
        document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        const filterType = this.getAttribute('data-type');
        if (filterType === 'all') {{
          cy.elements().style('display', 'element');
        }} else {{
          cy.nodes().forEach(node => {{
            if (node.data('type') === filterType) {{
              node.style('display', 'element');
            }} else {{
              node.style('display', 'none');
            }}
          }});
        }}
      }});
    }});

    // Layout Buttons
    document.getElementById('btn-cose').addEventListener('click', () => cy.layout({{ name: 'cose', animate: true }}).run());
    document.getElementById('btn-concentric').addEventListener('click', () => cy.layout({{ name: 'concentric', animate: true }}).run());
    document.getElementById('btn-reset').addEventListener('click', () => cy.fit());
  </script>
</body>
</html>"""

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, mode="w", encoding="utf-8") as f:
        f.write(html_content)

    return output_file


if __name__ == "__main__":
    print("-" * 65)
    print("Generating Cytoscape Dark Dashboard HTML ...")
    print("-" * 65)
    out = export_cytoscape_html()
    print(f"Exported Interactive Dashboard to: {out}")
    print("-" * 65)
