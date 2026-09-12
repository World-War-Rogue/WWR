/**
 * Pillar 3: Upgrades & Progression Analyzer
 * Evaluates upgrade curves, tech eras, return on investment (ROI), and power-creep traps.
 */
export class UpgradesAnalyzer {
  constructor(config) {
    this.config = config;
    this.thresholds = config.upgradeThresholds;
  }

  /**
   * Analyzes buildings, upgrade costs, tech eras, and progression curves.
   */
  analyze(buildings = [], units = []) {
    let score = 92;
    const issues = [];

    // Analyze Base Building Upgrade Curves
    const buildingUpgrades = this.analyzeBuildingUpgrades(buildings);

    // Analyze Tech Era Pacing
    const eraPacing = this.analyzeEraPacing(units);

    // ROI outlier detection
    const lowRoiUpgrades = buildingUpgrades.filter(u => u.roi < this.thresholds.minROI);
    const runawayUpgrades = buildingUpgrades.filter(u => u.roi > this.thresholds.maxROI);

    if (lowRoiUpgrades.length > 0) {
      issues.push({
        severity: 'MEDIUM',
        category: 'Progression Economy',
        message: `${lowRoiUpgrades.length} building upgrade tiers have substandard ROI (<${this.thresholds.minROI * 100}%), functioning as economic traps for players.`
      });
      score -= Math.min(10, lowRoiUpgrades.length * 3);
    }

    if (runawayUpgrades.length > 0) {
      issues.push({
        severity: 'HIGH',
        category: 'Power Creep',
        message: `${runawayUpgrades.length} building upgrades offer runaway power scaling (> ${this.thresholds.maxROI * 100}% ROI), risking defensive turtling and base unbreakability.`
      });
      score -= Math.min(12, runawayUpgrades.length * 4);
    }

    // Era Jump Ratio Check
    if (eraPacing.maxJumpRatio > this.thresholds.maxEraPowerJumpRatio) {
      issues.push({
        severity: 'HIGH',
        category: 'Era Balancing',
        message: `Excessive power jump ratio (${eraPacing.maxJumpRatio.toFixed(2)}x) detected across tech eras, prematurely obsoleting lower-tier military assets.`
      });
      score -= 10;
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      summary: {
        analyzedBuildings: buildings.length,
        upgradeTiersSimulated: buildingUpgrades.length,
        techErasCount: eraPacing.eras.length,
        avgUpgradeROI: buildingUpgrades.length > 0
          ? (buildingUpgrades.reduce((a, b) => a + b.roi, 0) / buildingUpgrades.length).toFixed(3)
          : '0.240',
        trapsDetected: lowRoiUpgrades.length,
        runawayUpgradesDetected: runawayUpgrades.length
      },
      buildingUpgrades,
      eraPacing,
      issues
    };
  }

  /**
   * Projects Level 1 through 10 upgrade progression for each base building.
   */
  analyzeBuildingUpgrades(buildings) {
    const results = [];
    const sampleBuildings = buildings.length > 0 ? buildings : this.getBaselineBuildingTemplates();

    for (const bldg of sampleBuildings) {
      const baseHp = bldg.hp || 2000;
      const baseDefense = bldg.defenseRating || 150;
      const initialCost = (bldg.upgradeCost?.fuel || 300) + (bldg.upgradeCost?.alloy || 500) + (bldg.upgradeCost?.munitions || 400);

      for (let level = 1; level <= 8; level++) {
        // Compound scaling model: HP + 25% per level, Cost + 35% per level
        const currentHp = Math.round(baseHp * Math.pow(1.25, level - 1));
        const nextHp = Math.round(baseHp * Math.pow(1.25, level));
        const deltaHp = nextHp - currentHp;

        const currentCost = Math.round(initialCost * Math.pow(1.35, level - 1));
        const nextCost = Math.round(initialCost * Math.pow(1.35, level));

        // ROI = Percent Gain in EHP / Normalized Cost Index
        const powerGainPercent = deltaHp / currentHp;
        const costFactor = nextCost / 1000;
        const roi = Math.round((powerGainPercent / costFactor) * 1000) / 1000;

        results.push({
          buildingName: bldg.name || bldg.id,
          type: bldg.type,
          level,
          nextLevel: level + 1,
          currentHp,
          nextHp,
          cost: nextCost,
          roi,
          isTrap: roi < this.thresholds.minROI,
          isRunaway: roi > this.thresholds.maxROI
        });
      }
    }

    return results;
  }

  /**
   * Analyzes tech era progression and power creep transitions.
   */
  analyzeEraPacing(units) {
    const eraSequence = ['Interwar', 'WW2', 'Cold War', 'Modern'];
    const eraUnits = {};

    for (const u of units) {
      const era = u.era || 'Modern';
      if (!eraUnits[era]) eraUnits[era] = [];
      eraUnits[era].push(u);
    }

    const eras = [];
    let previousPower = null;
    let maxJumpRatio = 1.0;

    for (const eraName of eraSequence) {
      const list = eraUnits[eraName] || [];
      const avgPower = list.length > 0
        ? Math.round(list.reduce((acc, u) => acc + (u.powerRating || 500), 0) / list.length)
        : (eraName === 'Interwar' ? 350 : eraName === 'WW2' ? 550 : eraName === 'Cold War' ? 750 : 950);

      let jumpRatio = 1.0;
      if (previousPower !== null) {
        jumpRatio = Math.round((avgPower / previousPower) * 100) / 100;
        if (jumpRatio > maxJumpRatio) maxJumpRatio = jumpRatio;
      }
      previousPower = avgPower;

      eras.push({
        era: eraName,
        unitCount: list.length,
        avgPower,
        jumpRatioFromPrevious: jumpRatio
      });
    }

    return {
      eras,
      maxJumpRatio
    };
  }

  /**
   * Default baseline base buildings if none parsed.
   */
  getBaselineBuildingTemplates() {
    return [
      { id: 'hq', name: 'Tactical HQ Command', type: 'hq', hp: 4500, defenseRating: 120, upgradeCost: { fuel: 800, alloy: 1200, munitions: 600 } },
      { id: 'ciws', name: 'Phalanx CIWS Gatling', type: 'ciws', hp: 2100, defenseRating: 240, upgradeCost: { fuel: 400, alloy: 700, munitions: 800 } },
      { id: 'howitzer', name: 'Hardened 155mm Howitzer', type: 'howitzer', hp: 2600, defenseRating: 310, upgradeCost: { fuel: 500, alloy: 900, munitions: 950 } }
    ];
  }
}
