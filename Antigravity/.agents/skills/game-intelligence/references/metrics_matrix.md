# A.E.G.I.S. Game Intelligence Metric Formulations & Thresholds

## 1. Game Design & Combat Formulations

### Effective Health Pool (EHP)
$$\text{EHP} = \text{HP} \times \left(1 + \frac{\text{Armor}}{100}\right)$$
- **Armor Scaling**: Each point of armor grants $+1\%$ effective survivability against standard kinetic rounds.
- **Penetration Attenuation**: High-penetration rounds reduce armor efficacy before computing deflection.

### Sustained Damage Per Second (DPS)
$$\text{DPS} = \text{Firepower} \times \text{FireRate} \times \left(1 + \frac{\text{Penetration}}{200}\right)$$

### Power Rating Efficiency Ratio
$$\text{Efficiency} = \frac{\text{EHP} + (\text{DPS} \times 10)}{\max(1, \text{PowerRating})}$$
- **Outlier Threshold**: Any unit whose efficiency deviates by $> 2.2\times$ from its era median is flagged for rebalancing.

---

## 2. Upgrades Return on Investment (ROI)

$$\text{ROI} = \frac{\Delta \text{PowerPercent}}{\text{NormalizedCostFactor}} = \frac{(\text{HP}_{L+1} - \text{HP}_L) / \text{HP}_L}{\text{Cost}_{L+1} / 1000}$$

- **ROI < 0.05**: Classified as an **Economic Trap Upgrade**.
- **ROI > 0.85**: Classified as a **Runaway Power Spike**.
- **Target ROI**: $0.15 - 0.45$.

---

## 3. Frame Budget Allocations (60 Hz / 16.66ms)

| Subsystem | Target Budget | Typical Complexity | Optimization Strategy |
| :--- | :---: | :---: | :--- |
| **Ballistics & Raycasting** | 3.2ms | $O(P \times U)$ | Broadphase spatial hash grid, continuous collision detection (CCD) |
| **Squad AI & Swarming** | 4.0ms | $O(U)$ | Time-sliced decision ticks (30 Hz update with 60 Hz interpolation) |
| **State Reconciliation** | 1.8ms | $O(S)$ | Bitpacked binary serialization, delta state diffing |
| **React View & Render** | 7.66ms | $O(C)$ | React.memo, pure component trees, unmemoized array cleanup |
