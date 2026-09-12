/**
 * Composite Game Health Scorecard
 * Computes unified 0-100 Game Health Index across the 4 core pillars.
 */
export class HealthScorecard {
  constructor(config) {
    this.weights = config.pillarWeights;
  }

  /**
   * Computes the weighted composite score and assigns military DEFCON readiness status.
   */
  compute(scores = {}) {
    const sDesign = scores.gameDesign ?? 85;
    const sUi = scores.uiUx ?? 85;
    const sUpgrades = scores.upgrades ?? 85;
    const sCompute = scores.computing ?? 85;

    const compositeScore = Math.round(
      (sDesign * this.weights.gameDesign) +
      (sUi * this.weights.uiUx) +
      (sUpgrades * this.weights.upgrades) +
      (sCompute * this.weights.computing)
    );

    let defconStatus = 'DEFCON 4: READINESS OPTIMAL';
    let defconLevel = 4;
    let color = '#22c55e'; // Green phosphor

    if (compositeScore < 60) {
      defconStatus = 'DEFCON 1: CRITICAL COMBAT DEGRADATION';
      defconLevel = 1;
      color = '#ef4444'; // Red
    } else if (compositeScore < 75) {
      defconStatus = 'DEFCON 2: ELEVATED SYSTEM FRICTION';
      defconLevel = 2;
      color = '#f59e0b'; // Amber
    } else if (compositeScore < 88) {
      defconStatus = 'DEFCON 3: GUARDED OPERATIONAL EFFICIENCY';
      defconLevel = 3;
      color = '#eab308'; // Yellow
    }

    return {
      compositeScore,
      defconLevel,
      defconStatus,
      statusColor: color,
      pillars: {
        gameDesign: { score: sDesign, weight: `${this.weights.gameDesign * 100}%` },
        uiUx: { score: sUi, weight: `${this.weights.uiUx * 100}%` },
        upgrades: { score: sUpgrades, weight: `${this.weights.upgrades * 100}%` },
        computing: { score: sCompute, weight: `${this.weights.computing * 100}%` }
      }
    };
  }
}
