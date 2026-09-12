/**
 * Specialized Analytical Engines for Last War: Survival Game
 * Covering Game Design, UI/UX, Upgrades & Progression, and Mobile Computing Profiling.
 */
import { LAST_WAR_DATA } from './data.mjs';

export class LastWarDesignAnalyzer {
  analyze() {
    const heroes = LAST_WAR_DATA.heroes;
    const rules = LAST_WAR_DATA.counterRules;

    const heroEvaluations = heroes.map(h => {
      const ehp = Math.round(h.baseHp * (1 + h.baseDefense / 20000));
      const burstDps = Math.round(h.baseAttack * h.skillMultiplier * (1 + h.critRate * 0.5));
      const efficiency = Math.round(((ehp / 20) + burstDps) / h.powerRating);

      return {
        id: h.id,
        name: h.name,
        type: h.type,
        tier: h.tier,
        role: h.role,
        ehp,
        burstDps,
        powerRating: h.powerRating,
        efficiency,
        isCoreMeta: h.isCoreMeta
      };
    });

    const topHero = [...heroEvaluations].sort((a, b) => b.efficiency - a.efficiency)[0];
    const issues = [];
    let score = 88;

    // Analyze Monotype dominance risk
    if (rules.monotypeBonus5Heroes >= 0.20) {
      issues.push({
        severity: 'MEDIUM',
        category: 'Squad Monotype Meta',
        message: 'The +20% monotype 5-hero bonus overwhelmingly penalizes creative hybrid squads, locking players into strict single-type lineups.'
      });
      score -= 8;
    }

    // Analyze Counter triangle volatility
    if (rules.damageBonusAgainstCounter >= 0.20) {
      issues.push({
        severity: 'LOW',
        category: 'Counter Triangle Polarisation',
        message: 'The +/-20% counter triangle differential creates sharp hard-counter outcomes where high-investment Tank squads can be defeated by lower-investment Aircraft squads.'
      });
      score -= 4;
    }

    return {
      score,
      summary: {
        totalHeroes: heroes.length,
        urHeroes: heroes.filter(h => h.tier === 'UR').length,
        ssrHeroes: heroes.filter(h => h.tier === 'SSR').length,
        typeDistribution: {
          tanks: heroes.filter(h => h.type === 'Tank').length,
          aircraft: heroes.filter(h => h.type === 'Aircraft').length,
          missiles: heroes.filter(h => h.type === 'Missile').length
        },
        topEfficiencyHero: `${topHero.name} (${topHero.type} ${topHero.tier})`
      },
      heroEvaluations,
      issues
    };
  }
}

export class LastWarUIUXAuditor {
  audit() {
    const profile = LAST_WAR_DATA.uiProfile;
    let score = 72; // Commercial mobile 4X games suffer from heavy cognitive load
    const issues = [];

    // Red-Dot Saturation Audit
    if (profile.activeRedDotBadgesSimultaneous > 15) {
      issues.push({
        severity: 'HIGH',
        category: 'Red-Dot Notification Fatigue & Cognitive Load',
        message: `Extremely high Red-Dot Saturation Index (${profile.activeRedDotBadgesSimultaneous} simultaneous notification badges) creates player attention fatigue and sensory overload.`
      });
      score -= 16;
    }

    // Microtransaction pop-up frequency
    if (profile.dailyPopupsPerSession > 3.0) {
      issues.push({
        severity: 'MEDIUM',
        category: 'Monetization Friction',
        message: `High popup frequency (${profile.dailyPopupsPerSession} popups per login session) obstructs core gameplay flow and navigation.`
      });
      score -= 8;
    }

    // Portrait Ergonomics
    issues.push({
      severity: 'LOW',
      category: 'Thumb Reach Ergonomics',
      message: 'On tall 19.5:9 smartphone displays, critical navigation buttons (VIP, profile, and stamina) reside outside the natural one-handed thumb zone.'
    });
    score -= 4;

    return {
      score,
      summary: {
        redDotSaturationIndex: profile.activeRedDotBadgesSimultaneous,
        dailyPopupsPerSession: profile.dailyPopupsPerSession,
        orientation: 'Portrait (One-Handed Mobile)',
        screenModes: 'Dual 2D Base View / 3D World Map / Auto-Battler'
      },
      issues
    };
  }
}

export class LastWarUpgradesAnalyzer {
  analyze() {
    const hq = LAST_WAR_DATA.hqProgression;
    const sf = LAST_WAR_DATA.specialForcesTree;
    const drone = LAST_WAR_DATA.droneSystem;

    let score = 80;
    const issues = [];

    // Gold Wall Bottleneck
    const hq30 = hq.find(h => h.level === 30);
    const totalGoldForT10 = sf.goldRequiredForT10;

    issues.push({
      severity: 'HIGH',
      category: 'Economic Bottleneck (Gold Wall)',
      message: `Massive Gold coin bottleneck ($4.8 Billion Gold required for T10 Special Forces research + $2.4 Billion for HQ 30) severely stalls progression past HQ 27.`
    });
    score -= 10;

    // Valor Badge Bottleneck
    issues.push({
      severity: 'MEDIUM',
      category: 'Time-Gated Currencies (Valor Badges)',
      message: `68,500 Valor Badges required for T10 troops restricts progression speed strictly to weekly Alliance Duel (VS) chest completion.`
    });
    score -= 6;

    // Drone Component Drop Asymmetry
    const rightSideSlots = drone.componentSlots.filter(s => s.side === 'Right');
    if (rightSideSlots.some(s => s.dropWeight < 0.20)) {
      issues.push({
        severity: 'MEDIUM',
        category: 'Asymmetric Component Drop Rates',
        message: 'Right-side drone components (Missile, Fuel Cell, Thermal Imager) have significantly depressed drop rates (15% vs 35% left side), forcing targeted spending.'
      });
      score -= 4;
    }

    return {
      score,
      summary: {
        hqLevelsModeled: hq.length,
        t10TroopPrerequisites: sf.prerequisites.join(', '),
        valorBadgesRequired: sf.valorBadgesRequiredForT10.toLocaleString(),
        goldRequiredForT10: `${(totalGoldForT10 / 1e9).toFixed(1)} Billion Gold`,
        droneMaxLevel: drone.maxLevel,
        rightSideBottleneckCount: rightSideSlots.length
      },
      progressionMilestones: hq,
      gatekeeperNodes: sf.gatekeeperNodes,
      issues
    };
  }
}

export class LastWarComputeProfiler {
  profile() {
    let score = 84;
    const issues = [];

    // Mobile Thermal Envelope & Frame Timing
    const mobile60fpsTargetMs = 16.66;
    const mobile30fpsTargetMs = 33.33;

    // Simulated frame time during a heavy 100-player world map rally / Desert Storm battle
    const worldMapRenderTimeMs = 12.4;
    const pathfindingAndMarchTimeMs = 8.6;
    const netcodeSyncTimeMs = 6.2;
    const totalMobileFrameTimeMs = Math.round((worldMapRenderTimeMs + pathfindingAndMarchTimeMs + netcodeSyncTimeMs) * 10) / 10;

    if (totalMobileFrameTimeMs > mobile60fpsTargetMs) {
      issues.push({
        severity: 'MEDIUM',
        category: 'Mobile Thermal Throttling',
        message: `High frame load (${totalMobileFrameTimeMs}ms) exceeds the 60 FPS mobile envelope (16.6ms), triggering GPU thermal throttling and battery drain on prolonged Desert Storm matches.`
      });
      score -= 10;
    }

    // Network Concurrency during Capitol War
    issues.push({
      severity: 'LOW',
      category: 'Server Concurrency & Rally Delta Sync',
      message: 'Simultaneous 100-member rally arrivals at Capitol / Cannon structures can generate 120-250ms latency spikes, leading to desynchronized march cancellations.'
    });
    score -= 6;

    return {
      score,
      summary: {
        simulatedMobileFrameTimeMs: totalMobileFrameTimeMs,
        target60fpsBudgetMs: mobile60fpsTargetMs,
        target30fpsBudgetMs: mobile30fpsTargetMs,
        estimatedMobileFPS: Math.min(60, Math.round(1000 / totalMobileFrameTimeMs)),
        thermalRiskLevel: totalMobileFrameTimeMs > 22 ? 'HIGH' : 'MODERATE'
      },
      subsystemBudgets: {
        rendering: worldMapRenderTimeMs,
        marchingLines: pathfindingAndMarchTimeMs,
        networkSync: netcodeSyncTimeMs
      },
      issues
    };
  }
}
