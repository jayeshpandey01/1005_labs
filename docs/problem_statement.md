The video is a brief for a take-home assignment by **1005 Intelligence Labs** titled **"Plan every Sales Officer's month: Build a proof of concept for automated journey plans (PJP)"**.

---

### 1. Problem Statement & Context

* **Current Territory & Routine:** A Sales Officer (SO) typically handles ~130 dealers (including key loyalty-club dealers) and a fixed daily starting point. Every working day requires visiting **6 focus dealers** and conducting **2 demand-generation calls** (architects, designers, contractors, or carpenters).
* **Core Issues with Manual Planning:**
* Only ~60% of planned focus-account visits occur.
* Actual adherence ranges from 35% to 55% across sample SOs.
* Over 50% of completed visits are ad-hoc.
* Behavior includes quota padding (e.g., 33 visits in a single month to a single dealer).


* **Missing External Market View:** Current planning only considers internal company sales. A large dealer with low wallet share can look identical to a small dealer giving 100% of their business. External GST filings reveal actual total turnover and missed growth headroom.

---

### 2. The 5-Stage Pipeline to Build

The assignment requires building an automated end-to-end pipeline covering:

1. **Rank:** Score dealers based on de-growth (value lost), GST growth potential, and sudden drops to select each SO’s focus dealers.
2. **Schedule:** Distribute dealer visits across 25 working days in November 2026, reserving time slots for 2 daily demand-generation calls.
3. **Route:** Order daily stops starting from the SO’s start point to minimize transit (suitable for both dense urban areas and spread-out upcountry territories).
4. **Nudge:** Generate data-grounded WhatsApp talking points/nudges sent the evening before each visit (e.g., scheme targets, points needed, drop in specific tiers).
5. **Re-plan:** Dynamically adapt and rewrite the schedule when visits are missed or sudden drops occur mid-month.

---

### 3. Rules & Operational Constraints

* **Calendar:** November 2026 has **25 working days**.
* **Daily Load:** 6 focus dealer visits + time reserved for 2 demand-generation calls.
* **Working Hours:** 09:30 to 18:30 starting from the home base.
* **Dealer Frequency:**
* **Club Dealers:** 2 visits per month (spaced ~2 weeks apart).
* **Other Focus Dealers:** 1 visit per month.
* **Guardrail:** No dealer receives more than 2 visits per month.



---

### 4. Target Success Metrics

* **Focus-Account Coverage:** Increase from ~40–60% to **100%**.
* **Achievable Adherence:** Realistic daily routes allowing visits to fit into work hours (accounting for travel time), raising adherence from ~60% to **90%**.
* **Prioritization:** Ensure value-at-risk accounts are scheduled within the first 10 working days.
* **Route Efficiency:** Measurable reduction in travel kilometers and transit minutes.
* **Guardrail Breaches:** Eliminate visit and frequency cap violations (**0 breaches**).

---

### 5. Input Data & Submission Deliverables (Within 5 Days)

* **Provided Data:**
* Officer and dealer profiles (677 outlets with geographic coordinates).
* 18-month daily sales history broken down by dealer and product tier.
* SFDC visit logs (planned vs. ad-hoc).
* GST turnover brackets and filing regularity.
* Loyalty scheme milestones, baselines, and point structures.


* **Deliverables to Submit:**
* A single executable Git repository running end-to-end via one command.
* Monthly schedule CSV per Sales Officer.
* Re-planned scenario run output.
* At least 5 data-backed WhatsApp sample nudges.
* A 2-page approach and findings write-up.