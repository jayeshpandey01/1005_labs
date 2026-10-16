# Spatial Graph Routing & Physics Specification

This reference details the mathematical modeling of territory geography, road detour dynamics, and daily TSP route optimization.

---

## 1. Territory Geography & Parameters

| Parameter | Metro (`SO-A`, `SO-B`) | Upcountry (`SO-C`) | Source |
|---|---|---|---|
| **Territory Type** | Dense urban (Bengaluru) | Multi-town (Hubballi–Dharwad–Belagavi) | `Officers` sheet |
| **Transit Speed** | 18 km/h | 30 km/h | `simulate.py` CFG |
| **Road Detour Factor** | 1.35 | 1.35 | Straight-line $\times 1.35$ |
| **Missing Coordinate Penalty** | 25 minutes | 45 minutes | `simulate.py` CFG |
| **Rain Multiplier** | $\times 1.5$ | $\times 1.5$ | On rain days, travel is $1.5\times$ slower |
| **Traffic Multiplier** | $\times 1.3$ | $\times 1.3$ | On traffic days, travel is $1.3\times$ slower |
| **Disrupted Day Cap** | Max 5 completed visits | Max 5 completed visits | 6th visit becomes `missed_weather` |

---

## 2. Daily Time Budget Algebra

* Total Working Window: 09:30 to 18:30 = **540 minutes**.
* Reserved for Demand-Gen: 2 calls $\times 40\text{ min} = \mathbf{80\text{ minutes}}$ (mandatory, holds back time).
* **Net Available Focus Budget:** $540 - 80 = \mathbf{460\text{ minutes}}$.
* Dealer Call Duration: $6 \times 25\text{ min} = \mathbf{150\text{ minutes}}$.
* **Maximum Available Transit Budget:** $460 - 150 = \mathbf{310\text{ minutes}}$.

---

## 3. 2-Opt TSP Algorithm Formulation

For each working day $d$ and Sales Officer $so$:
1. Nodes: $V = \{0, 1, 2, 3, 4, 5, 6\}$, where $0$ is the SO home base coordinates, and $1..6$ are the 6 scheduled focus dealers.
2. Edge Weight $w(i, j)$:
   * If both coordinates known: $w(i, j) = \frac{\text{Haversine}(i, j) \times 1.35}{\text{speed}} \times 60$.
   * If an unlocated dealer is involved: $w(i, j) = 25\text{ min (metro)} \text{ or } 45\text{ min (upcountry)}$.
3. Solve open-ended or closed tour minimizing total transit time using 2-opt pairwise edge exchange.
4. Verify total travel time + call times $\le 460\text{ minutes}$.
