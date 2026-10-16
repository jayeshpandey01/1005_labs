# Scoring Matrix & Evaluation Criteria

The November 2026 simulation evaluates plans against a weighted 100-point metric suite.

---

## 1. Metric Definitions & Weights

| Metric | Weight | Definition in `simulate.py` | Target |
|---|---|---|---|
| **Simulated Adherence** | **30%** | $\frac{\text{Completed Visits}}{\text{Planned Visits on Morning of Each Day}}$ | $\ge 90\%$ (Baseline: ~35–55%) |
| **Focus-Dealer Coverage** | **25%** | $\frac{\text{Original Focus Dealers Receiving Required Visits}}{\text{Total Unique Dealers in Initial Plan}}$ (Club: 2, Other: 1) | $\ge 95\%$ (Baseline: ~40–60%) |
| **Drop Response** | **20%** | $\frac{\text{Sales Drops Visited within 7 Days of Onset}}{\text{Total Simulated Drop Events}}$ | $\ge 70\%$ |
| **Club Cadence** | **10%** | $\frac{\text{Club Dealers Visited Twice with } \ge 10\text{ Days Gap}}{\text{Total Club Dealers in Focus Set}}$ | $100\%$ |
| **Hike Handling** | **5%** | $\frac{\text{Visits Cancelled during Spike}}{\text{Total Opportunities}}$ | $> 0$ cancellations logged |
| **Guardrails & Reliability** | **10%** | 0 breaches of daily visit cap ($\le 6$), dealer visit cap ($\le 2$), cross-SO visits, and 0 replan timeouts ($< 120$s). | **100% (0 breaches)** |

---

## 2. Qualitative Criteria (Assignment Review - 100%)

* **Problem Framing & Judgement (20%):** Realistic data gap handling, clear assumptions.
* **Ranking Logic (25%):** Value-weighted, explainable, uses GST headroom, handles dormant & parent/child accounts.
* **Scheduling, Routing & Results (25%):** Rules respected, feasible routes in metro and upcountry.
* **Code Quality & Reproducibility (15%):** Clean, tested, single-command run from workbook.
* **Communication (15%):** Clear 2-page write-up and actionable WhatsApp nudges.
