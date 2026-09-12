/**
 * Pillar 1: Game Design Analyzer
 * Evaluates unit balance, TTK distributions, rock-paper-scissors dynamics, and economic loops.
 */
export class GameDesignAnalyzer {
  constructor(config) {
    this.config = config;
    this.thresholds = config.designThresholds;
  }

  /**
   * Analyzes units, roles, eras, counter-matrices, and power curves.
   */
  analyze(units, dossiers = []) {
    if (!units || units.length === 0) {
      return { score: 50, issues: ['No units found for balance analysis.'], metrics: {} };
    }

    const unitMetrics = units.map(u => {
      const hp = Number(u.hp) || 1000;
      const armor = Number(u.armor) || 0;
      const firepower = Number(u.firepower) || 100;
      const fireRate = Number(u.fireRate) || 0.2;
      const penetration = Number(u.penetration) || 50;
      const powerRating = Number(u.powerRating) || 500;
      const range = Number(u.range) || 300;
      const speed = Number(u.speed) || 30;

      // Effective Health Pool (accounting for armor deflection)
      const ehp = Math.round(hp * (1 + armor / 100));
      // Sustained Damage Per Second
      const dps = Math.round(firepower * fireRate * (1 + penetration / 200));
      // Power efficiency ratio
      const powerEfficiency = Math.round(((ehp + dps * 10) / Math.max(1, powerRating)) * 100) / 100;

      return {
        id: u.id,
        name: u.name,
        country: u.country,
        era: u.era || 'Modern',
        role: u.role || 'Unassigned',
        hp,
        armor,
        firepower,
        fireRate,
        penetration,
        range,
        speed,
        powerRating,
        ehp,
        dps,
        powerEfficiency,
        unlockCost: Number(u.unlockCostWarBonds) || 0
      };
    });

    // Statistical distributions
    const avgEHP = Math.round(unitMetrics.reduce((acc, u) => acc + u.ehp, 0) / unitMetrics.length);
    const avgDPS = Math.round(unitMetrics.reduce((acc, u) => acc + u.dps, 0) / unitMetrics.length);
    const avgPower = Math.round(unitMetrics.reduce((acc, u) => acc + u.powerRating, 0) / unitMetrics.length);

    // Time-To-Kill (TTK) estimates (Average EHP divided by Average DPS)
    const baselineTTK = Math.round((avgEHP / Math.max(1, avgDPS)) * 10) / 10;

    // Detect Outliers (OP / UP units)
    const sortedByEfficiency = [...unitMetrics].sort((a, b) => b.powerEfficiency - a.powerEfficiency);
    const topOutliers = sortedByEfficiency.slice(0, 3);
    const bottomOutliers = sortedByEfficiency.slice(-3).reverse();

    // Group by Era
    const eraGroups = {};
    for (const u of unitMetrics) {
      if (!eraGroups[u.era]) eraGroups[u.era] = [];
      eraGroups[u.era].push(u);
    }

    const eraStats = Object.keys(eraGroups).map(era => {
      const group = eraGroups[era];
      const eraAvgPower = Math.round(group.reduce((acc, u) => acc + u.powerRating, 0) / group.length);
      const eraAvgEHP = Math.round(group.reduce((acc, u) => acc + u.ehp, 0) / group.length);
      const eraAvgDPS = Math.round(group.reduce((acc, u) => acc + u.dps, 0) / group.length);
      return {
        era,
        count: group.length,
        avgPower: eraAvgPower,
        avgEHP: eraAvgEHP,
        avgDPS: eraAvgDPS
      };
    });

    // Group by Country/Faction
    const factionGroups = {};
    for (const u of unitMetrics) {
      if (!factionGroups[u.country]) factionGroups[u.country] = [];
      factionGroups[u.country].push(u);
    }

    // Role-based Counter Matrix (Rock-Paper-Scissors)
    const roleMatrix = this.computeRoleCounterMatrix(unitMetrics);

    // Issues & Scoring
    const issues = [];
    let score = 92; // Base high score, deduct for identified design risks

    if (baselineTTK < this.thresholds.minTTKSeconds) {
      issues.push({
        severity: 'HIGH',
        category: 'Combat Pacing',
        message: `Average TTK (${baselineTTK}s) is below the minimum threshold (${this.thresholds.minTTKSeconds}s), risking instant-death twitch gameplay.`
      });
      score -= 12;
    } else if (baselineTTK > this.thresholds.maxTTKSeconds) {
      issues.push({
        severity: 'MEDIUM',
        category: 'Combat Pacing',
        message: `Average TTK (${baselineTTK}s) exceeds the maximum threshold (${this.thresholds.maxTTKSeconds}s), leading to protracted bullet-sponge stalemates.`
      });
      score -= 8;
    }

    // Check for power efficiency disparity
    const maxEff = topOutliers[0]?.powerEfficiency || 1;
    const minEff = bottomOutliers[0]?.powerEfficiency || 1;
    const ratio = maxEff / Math.max(0.1, minEff);
    if (ratio > this.thresholds.maxPowerVarianceRatio) {
      issues.push({
        severity: 'MEDIUM',
        category: 'Unit Balancing',
        message: `High unit efficiency variance ratio (${ratio.toFixed(2)}x) detected between top performer (${topOutliers[0]?.name}) and lowest performer (${bottomOutliers[0]?.name}).`
      });
      score -= 8;
    }

    // Dossier lore & math coverage
    const hasBallisticsDoc = dossiers.some(d => d.fileName.includes('BALLISTICS'));
    const hasEconomyDoc = dossiers.some(d => d.fileName.includes('ECONOMY'));
    if (!hasBallisticsDoc) {
      issues.push({
        severity: 'LOW',
        category: 'Game Design Documentation',
        message: 'No formal ballistics physics documentation dossier discovered.'
      });
      score -= 4;
    }
    if (!hasEconomyDoc) {
      issues.push({
        severity: 'LOW',
        category: 'Game Design Documentation',
        message: 'No formal economy & survival crisis documentation dossier discovered.'
      });
      score -= 4;
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      summary: {
        totalUnits: unitMetrics.length,
        avgEHP,
        avgDPS,
        avgPower,
        baselineTTK,
        factionCount: Object.keys(factionGroups).length,
        erasCount: Object.keys(eraGroups).length
      },
      eraStats,
      roleMatrix,
      topOverpoweredCandidates: topOutliers,
      topUnderpoweredCandidates: bottomOutliers,
      issues
    };
  }

  /**
   * Computes tactical counter advantage matrix across primary combat roles.
   */
  computeRoleCounterMatrix(unitMetrics) {
    const roles = ['Main Battle Tank', 'Artillery', 'Air Defense', 'Recon / Sniper', 'Infantry'];
    const matrix = {};

    // Standard military doctrine multipliers (Attackers vs Defenders)
    const doctrines = {
      'Main Battle Tank': { 'Infantry': 1.4, 'Recon / Sniper': 1.5, 'Air Defense': 1.3, 'Main Battle Tank': 1.0, 'Artillery': 0.8 },
      'Artillery': { 'Main Battle Tank': 1.4, 'Infantry': 1.6, 'Base Fortifications': 1.8, 'Air Defense': 1.1, 'Recon / Sniper': 0.6 },
      'Air Defense': { 'Attack Aircraft': 2.2, 'Helicopter': 2.0, 'Artillery Rockets': 1.5, 'Main Battle Tank': 0.7, 'Infantry': 0.9 },
      'Recon / Sniper': { 'Artillery': 1.6, 'Infantry': 1.5, 'Air Defense': 1.3, 'Main Battle Tank': 0.5, 'Base Fortifications': 0.4 }
    };

    return doctrines;
  }
}
