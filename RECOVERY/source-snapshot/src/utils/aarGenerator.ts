import {
  CombatEntity,
  CombatUnitTelemetry,
  CombatMilestoneEvent,
  CombatTelemetrySnapshot,
  ComparativeMetricItem,
  CombatAfterActionReport,
} from '../types';

interface GenerateAARParams {
  result: 'victory' | 'defeat';
  durationSec: number;
  theaterName: string;
  playerCommanderName: string;
  playerCommanderRank: string;
  playerSquadName: string;
  playerSquadPower: number;
  enemyCommanderName: string;
  enemyCommanderServer: string;
  enemyCommanderFlag: string;
  enemySquadPower: number;
  playerEntities: CombatEntity[];
  enemyEntities: CombatEntity[];
  telemetryMap?: Record<string, Partial<CombatUnitTelemetry>>;
  snapshots?: CombatTelemetrySnapshot[];
  milestones?: CombatMilestoneEvent[];
  salvage?: { fuel: number; munitions: number; alloy: number; warBonds: number };
}

export function generateCombatAfterActionReport(params: GenerateAARParams): CombatAfterActionReport {
  const {
    result,
    durationSec,
    theaterName,
    playerCommanderName,
    playerCommanderRank,
    playerSquadName,
    playerSquadPower,
    enemyCommanderName,
    enemyCommanderServer,
    enemyCommanderFlag,
    enemySquadPower,
    playerEntities,
    enemyEntities,
    telemetryMap = {},
    snapshots: initialSnapshots = [],
    milestones: initialMilestones = [],
    salvage = {
      fuel: result === 'victory' ? 800 : 250,
      munitions: result === 'victory' ? 600 : 180,
      alloy: result === 'victory' ? 500 : 120,
      warBonds: result === 'victory' ? 150 : 40,
    },
  } = params;

  const combatDuration = Math.max(4.0, durationSec);

  // 1. Build Full Player Unit Telemetry
  const playerUnits: CombatUnitTelemetry[] = playerEntities.map((e) => {
    const tele = telemetryMap[e.id] || {};
    const shotsFired = tele.shotsFired ?? Math.max(4, Math.round(combatDuration * e.fireRate * 1.2 + Math.random() * 3));
    const hitsLanded = tele.hitsLanded ?? Math.max(2, Math.round(shotsFired * (0.65 + (e.penetration > 120 ? 0.2 : 0.1))));
    const damageDealt = tele.damageDealt ?? Math.round(hitsLanded * e.firepower * 0.85);
    const damageTaken = tele.damageTaken ?? (e.maxHp - Math.max(0, e.hp));
    const destroyed = e.destroyed || e.hp <= 0;

    return {
      id: e.id,
      name: e.name,
      team: 'player',
      country: e.country,
      role: e.role,
      initialHp: e.maxHp,
      finalHp: Math.max(0, e.hp),
      maxHp: e.maxHp,
      armor: e.armor,
      firepower: e.firepower,
      speed: e.speed,
      penetration: e.penetration,
      range: e.range,
      blastRadius: e.blastRadius,
      fireRate: e.fireRate,
      damageDealt,
      damageTaken,
      shotsFired,
      hitsLanded,
      kills: tele.kills ?? (result === 'victory' && !destroyed ? Math.floor(Math.random() * 2) + 1 : 0),
      criticalHits: tele.criticalHits ?? Math.round(hitsLanded * 0.28),
      ricochetsCaused: tele.ricochetsCaused ?? Math.round((damageTaken / 120) * 0.4),
      destroyed,
      timeOfDeathSec: destroyed ? tele.timeOfDeathSec ?? Math.round(combatDuration * (0.4 + Math.random() * 0.5) * 10) / 10 : undefined,
    };
  });

  // 2. Build Full Enemy Unit Telemetry
  const enemyUnits: CombatUnitTelemetry[] = enemyEntities.map((e) => {
    const tele = telemetryMap[e.id] || {};
    const shotsFired = tele.shotsFired ?? Math.max(3, Math.round(combatDuration * e.fireRate * 1.1 + Math.random() * 2));
    const hitsLanded = tele.hitsLanded ?? Math.max(1, Math.round(shotsFired * 0.62));
    const damageDealt = tele.damageDealt ?? Math.round(hitsLanded * e.firepower * 0.75);
    const damageTaken = tele.damageTaken ?? (e.maxHp - Math.max(0, e.hp));
    const destroyed = e.destroyed || e.hp <= 0;

    return {
      id: e.id,
      name: e.name,
      team: 'enemy',
      country: e.country || 'DE',
      role: e.role,
      initialHp: e.maxHp,
      finalHp: Math.max(0, e.hp),
      maxHp: e.maxHp,
      armor: e.armor,
      firepower: e.firepower,
      speed: e.speed,
      penetration: e.penetration,
      range: e.range,
      blastRadius: e.blastRadius,
      fireRate: e.fireRate,
      damageDealt,
      damageTaken,
      shotsFired,
      hitsLanded,
      kills: tele.kills ?? (result === 'defeat' && !destroyed ? Math.floor(Math.random() * 2) + 1 : 0),
      criticalHits: tele.criticalHits ?? Math.round(hitsLanded * 0.22),
      ricochetsCaused: tele.ricochetsCaused ?? Math.round((damageTaken / 110) * 0.45),
      destroyed,
      timeOfDeathSec: destroyed ? tele.timeOfDeathSec ?? Math.round(combatDuration * (0.3 + Math.random() * 0.6) * 10) / 10 : undefined,
    };
  });

  // Aggregate stats for both sides
  const pTotalHp = playerUnits.reduce((acc, u) => acc + u.initialHp, 0);
  const pRemainingHp = playerUnits.reduce((acc, u) => acc + u.finalHp, 0);
  const eTotalHp = enemyUnits.reduce((acc, u) => acc + u.initialHp, 0);
  const eRemainingHp = enemyUnits.reduce((acc, u) => acc + u.finalHp, 0);

  const pTotalFirepower = playerUnits.reduce((acc, u) => acc + u.firepower, 0);
  const eTotalFirepower = enemyUnits.reduce((acc, u) => acc + u.firepower, 0);

  const pMaxPen = Math.max(...playerUnits.map((u) => u.penetration), 100);
  const eMaxPen = Math.max(...enemyUnits.map((u) => u.penetration), 100);

  const pAvgArmor = Math.round(playerUnits.reduce((acc, u) => acc + u.armor, 0) / Math.max(1, playerUnits.length));
  const eAvgArmor = Math.round(enemyUnits.reduce((acc, u) => acc + u.armor, 0) / Math.max(1, enemyUnits.length));

  const pShots = playerUnits.reduce((acc, u) => acc + u.shotsFired, 0);
  const pHits = playerUnits.reduce((acc, u) => acc + u.hitsLanded, 0);
  const pAccuracy = pShots > 0 ? Math.round((pHits / pShots) * 1000) / 10 : 72;

  const eShots = enemyUnits.reduce((acc, u) => acc + u.shotsFired, 0);
  const eHits = enemyUnits.reduce((acc, u) => acc + u.hitsLanded, 0);
  const eAccuracy = eShots > 0 ? Math.round((eHits / eShots) * 1000) / 10 : 66.5;

  const pTotalDamage = playerUnits.reduce((acc, u) => acc + u.damageDealt, 0);
  const eTotalDamage = enemyUnits.reduce((acc, u) => acc + u.damageDealt, 0);

  const pAvgSpeed = Math.round(playerUnits.reduce((acc, u) => acc + u.speed, 0) / Math.max(1, playerUnits.length));
  const eAvgSpeed = Math.round(enemyUnits.reduce((acc, u) => acc + u.speed, 0) / Math.max(1, enemyUnits.length));

  const pAvgRange = Math.round(playerUnits.reduce((acc, u) => acc + u.range, 0) / Math.max(1, playerUnits.length));
  const eAvgRange = Math.round(enemyUnits.reduce((acc, u) => acc + u.range, 0) / Math.max(1, enemyUnits.length));

  const pAvgBlast = Math.round(playerUnits.reduce((acc, u) => acc + u.blastRadius, 0) / Math.max(1, playerUnits.length));
  const eAvgBlast = Math.round(enemyUnits.reduce((acc, u) => acc + u.blastRadius, 0) / Math.max(1, enemyUnits.length));

  const pRicochets = playerUnits.reduce((acc, u) => acc + u.ricochetsCaused, 0);
  const eRicochets = enemyUnits.reduce((acc, u) => acc + u.ricochetsCaused, 0);

  const pCrits = playerUnits.reduce((acc, u) => acc + u.criticalHits, 0);
  const eCrits = enemyUnits.reduce((acc, u) => acc + u.criticalHits, 0);

  const pLosses = playerUnits.filter((u) => u.destroyed).length;
  const eLosses = enemyUnits.filter((u) => u.destroyed).length;

  // Helper to build metric items with math
  const makeMetric = (
    id: string,
    label: string,
    category: ComparativeMetricItem['category'],
    pVal: number,
    eVal: number,
    unitSuffix: string,
    higherIsBetter: boolean,
    analysis: string
  ): ComparativeMetricItem => {
    let advantageSide: 'player' | 'enemy' | 'tied' = 'tied';
    let advPct = 0;

    const diff = pVal - eVal;
    const base = higherIsBetter ? Math.min(pVal, eVal) : Math.max(pVal, eVal);
    const absDiff = Math.abs(diff);

    if (Math.abs(diff) > 0.001) {
      if (higherIsBetter) {
        advantageSide = diff > 0 ? 'player' : 'enemy';
      } else {
        advantageSide = diff < 0 ? 'player' : 'enemy';
      }
      advPct = base > 0 ? Math.round((absDiff / Math.max(1, base)) * 1000) / 10 : 0;
    }

    return {
      id,
      label,
      category,
      playerValue: pVal,
      enemyValue: eVal,
      unitSuffix,
      higherIsBetter,
      advantageSide,
      advantagePct: Math.min(999, advPct),
      analysis,
    };
  };

  // 3. Exhaustive Comparison Across All 6 Metric Categories
  const comparativeMetrics: ComparativeMetricItem[] = [
    // --- FIREPOWER & ALPHA STRIKE ---
    makeMetric(
      'firepower_total',
      'Squad Cumulative Firepower',
      'Firepower & Alpha Strike',
      pTotalFirepower,
      eTotalFirepower,
      'pts',
      true,
      pTotalFirepower >= eTotalFirepower
        ? 'Your battlegroup maintained superior primary gun caliber, yielding overwhelming single-volley suppression.'
        : 'Hostile MBTs mounted heavier rifled/smoothbore armament with superior explosive warheads.'
    ),
    makeMetric(
      'firepower_alpha',
      'Alpha-Strike Volley Output',
      'Firepower & Alpha Strike',
      Math.round(pTotalFirepower * 0.82),
      Math.round(eTotalFirepower * 0.78),
      'dmg',
      true,
      'Opening coordinated volley damage. Breached front armor plates before defensive smoke deployed.'
    ),
    makeMetric(
      'firepower_pen',
      'Peak Armor Penetration (APFSDS)',
      'Firepower & Alpha Strike',
      pMaxPen,
      eMaxPen,
      'mm RHA',
      true,
      pMaxPen >= eMaxPen
        ? 'Your hypervelocity darts cleanly breached hostile turret composite arrays with zero ricochets.'
        : 'Hostile Kornet ATGM tandem warheads and 125mm APFSDS penetrated your front glacis plates.'
    ),
    makeMetric(
      'firepower_dps',
      'Sustained Damage Output Rate',
      'Firepower & Alpha Strike',
      Math.round(pTotalDamage / combatDuration),
      Math.round(eTotalDamage / combatDuration),
      'dmg/s',
      true,
      'Mean active damage output per combat second delivered across all opposing targets.'
    ),
    makeMetric(
      'firepower_he_share',
      'Heavy Ordnance Firepower Share',
      'Firepower & Alpha Strike',
      Math.round((playerUnits.filter((u) => u.blastRadius > 30).length / playerUnits.length) * 100),
      Math.round((enemyUnits.filter((u) => u.blastRadius > 30).length / enemyUnits.length) * 100),
      '%',
      true,
      'Proportion of squad firepower utilizing High-Explosive shrapnel or artillery calibers.'
    ),

    // --- SURVIVABILITY & ARMOR PROTECTION ---
    makeMetric(
      'armor_total_hp',
      'Squad Total Hull Health',
      'Survivability & Armor Protection',
      pTotalHp,
      eTotalHp,
      'HP',
      true,
      'Gross battlefield durability and structural integrity pool across all deployed hulls.'
    ),
    makeMetric(
      'armor_rating_avg',
      'Average Effective Armor Rating',
      'Survivability & Armor Protection',
      pAvgArmor,
      eAvgArmor,
      'pts',
      true,
      pAvgArmor >= eAvgArmor
        ? 'Chobham composite armor layers mitigated up to 60% of incoming kinetic dart energy.'
        : 'Opposing T-90M and BMP-3 hulls fielded thicker ERA tiles, deflecting standard kinetic shots.'
    ),
    makeMetric(
      'armor_ricochet_eff',
      'Armor Deflection & Ricochet Count',
      'Survivability & Armor Protection',
      pRicochets,
      eRicochets,
      'deflections',
      true,
      'Number of incoming ballistic projectiles that failed to penetrate and glanced off angled armor.'
    ),
    makeMetric(
      'armor_retained_pct',
      'Hull Integrity Preservation',
      'Survivability & Armor Protection',
      Math.round((pRemainingHp / pTotalHp) * 1000) / 10,
      Math.round((eRemainingHp / eTotalHp) * 1000) / 10,
      '%',
      true,
      'Percentage of original squad hull structural integrity remaining at combat termination.'
    ),
    makeMetric(
      'armor_dmg_absorbed',
      'Armor Damage Absorbed Under Fire',
      'Survivability & Armor Protection',
      Math.round(playerUnits.reduce((acc, u) => acc + u.damageTaken, 0)),
      Math.round(enemyUnits.reduce((acc, u) => acc + u.damageTaken, 0)),
      'dmg',
      true,
      'Gross kinetic and thermal punishment absorbed by vehicle hulls and reactive armor.'
    ),

    // --- TACTICAL GUNNERY & ACCURACY ---
    makeMetric(
      'gunnery_accuracy',
      'Ballistic Gunnery Accuracy',
      'Tactical Gunnery & Accuracy',
      pAccuracy,
      eAccuracy,
      '%',
      true,
      pAccuracy >= eAccuracy
        ? 'Laser rangefinders and stabilized gun sights maintained pinpoint shot clustering.'
        : 'Hostile computerized ballistic computers achieved superior first-round hit probabilities.'
    ),
    makeMetric(
      'gunnery_crits',
      'Critical Penetration Hits',
      'Tactical Gunnery & Accuracy',
      pCrits,
      eCrits,
      'crits',
      true,
      'Armored penetrations striking ammo carousels, engine decks, or optical sensor heads.'
    ),
    makeMetric(
      'gunnery_range_avg',
      'Effective Engagement Range',
      'Tactical Gunnery & Accuracy',
      pAvgRange,
      eAvgRange,
      'm',
      true,
      pAvgRange >= eAvgRange
        ? 'Longer standoff range permitted friendly artillery and railguns to engage before enemy closed in.'
        : 'Enemy 2S19 Msta-S and Ka-52 gunships out-ranged friendly defenses from long standoff distances.'
    ),
    makeMetric(
      'gunnery_munitions_eff',
      'Munitions Lethality Efficiency',
      'Tactical Gunnery & Accuracy',
      pShots > 0 ? Math.round(pTotalDamage / pShots) : 280,
      eShots > 0 ? Math.round(eTotalDamage / eShots) : 260,
      'dmg/shot',
      true,
      'Average damage yield extracted per high-caliber shell and missile expended in combat.'
    ),

    // --- MOBILITY & TRAVERSE ---
    makeMetric(
      'mobility_avg_speed',
      'Cruising Maneuver Speed',
      'Mobility & Traverse',
      pAvgSpeed,
      eAvgSpeed,
      'km/h',
      true,
      pAvgSpeed >= eAvgSpeed
        ? 'Superior tactical road speed enabled rapid repositioning into defilade and flanking angles.'
        : 'Lighter hostile IFV and helicopter maneuver speed enabled them to dictate the engagement axis.'
    ),
    makeMetric(
      'mobility_sprint_peak',
      'Vanguard Dash Velocity',
      'Mobility & Traverse',
      Math.max(...playerUnits.map((u) => u.speed), 45),
      Math.max(...enemyUnits.map((u) => u.speed), 42),
      'km/h',
      true,
      'Top operational speed of the fastest reconnaissance / assault vehicle in the formation.'
    ),
    makeMetric(
      'mobility_traverse_index',
      'Turret Slew & Hull Traverse Index',
      'Mobility & Traverse',
      Math.round(pAvgSpeed * 0.9 + 12),
      Math.round(eAvgSpeed * 0.9 + 10),
      'pts',
      true,
      'Responsiveness in swiveling turrets and traversing hulls to counter flanking threats.'
    ),

    // --- EXPLOSIVE & AREA IMPACT ---
    makeMetric(
      'explosive_blast_rad',
      'High-Explosive Blast Dispersion',
      'Explosive & Area Impact',
      pAvgBlast,
      eAvgBlast,
      'm',
      true,
      'Mean fragmentation and overpressure blast radius for explosive shells and air call-ins.'
    ),
    makeMetric(
      'explosive_area_dmg',
      'Area-of-Effect Splash Damage',
      'Explosive & Area Impact',
      Math.round(pTotalDamage * 0.35),
      Math.round(eTotalDamage * 0.28),
      'dmg',
      true,
      'Collateral damage inflicted on secondary combatants and destructible battlefield fuel reserves.'
    ),
    makeMetric(
      'explosive_callin_yield',
      'Tactical Call-In Fire Yield',
      'Explosive & Area Impact',
      result === 'victory' ? 1650 : 820,
      1100,
      'dmg',
      true,
      'Total damage delivered via tactical airstrike, EMP pulses, and coordinated artillery barrages.'
    ),

    // --- ATTRITION, CASUALTIES & EFFICIENCY ---
    makeMetric(
      'efficiency_exchange_ratio',
      'Casualty Exchange Ratio (CER)',
      'Attrition, Casualties & Efficiency',
      Math.max(1, pLosses) > 0 ? Math.round((eLosses / Math.max(1, pLosses)) * 100) / 100 : 6.0,
      Math.max(1, eLosses) > 0 ? Math.round((pLosses / Math.max(1, eLosses)) * 100) / 100 : 0.5,
      'ratio',
      true,
      `Decisive ${eLosses}:${pLosses} kill-loss ratio proved devastating tactical formation superiority.`
    ),
    makeMetric(
      'efficiency_ttk',
      'Neutralization Velocity (TTK)',
      'Attrition, Casualties & Efficiency',
      Math.round((combatDuration / Math.max(1, eLosses)) * 10) / 10,
      Math.round((combatDuration / Math.max(1, pLosses)) * 10) / 10,
      'sec/kill',
      false, // lower is better
      'Average time required to track, engage, penetrate, and completely neutralize a hostile unit.'
    ),
    makeMetric(
      'efficiency_preservation',
      'Squad Preservation Rate',
      'Attrition, Casualties & Efficiency',
      Math.round(((playerUnits.length - pLosses) / playerUnits.length) * 100),
      Math.round(((enemyUnits.length - eLosses) / enemyUnits.length) * 100),
      '%',
      true,
      'Percentage of deployed vehicles that survived the firefight without complete hull loss.'
    ),
  ];

  // 4. Synthesize Snapshots (Fluctuations over time)
  let finalSnapshots: CombatTelemetrySnapshot[] = [];
  if (initialSnapshots.length >= 3) {
    finalSnapshots = initialSnapshots;
  } else {
    // Generate synthetic smooth curve snapshots based on unit initial/final states
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      const t = Math.round(combatDuration * prog * 10) / 10;

      // S-curve interpolation
      const playerHpCurve = Math.round(
        pTotalHp - (pTotalHp - pRemainingHp) * Math.pow(prog, 1.4)
      );
      const enemyHpCurve = Math.round(
        eTotalHp - (eTotalHp - eRemainingHp) * Math.pow(prog, 0.9)
      );

      const activePlayerUnits = playerUnits.filter((u) => !u.destroyed || (u.timeOfDeathSec ?? 999) > t).length;
      const activeEnemyUnits = enemyUnits.filter((u) => !u.destroyed || (u.timeOfDeathSec ?? 999) > t).length;

      const unitStates: Record<
        string,
        {
          hp: number;
          maxHp: number;
          destroyed: boolean;
          damageDealt: number;
          damageTaken: number;
          shotsFired: number;
          hitsLanded: number;
        }
      > = {};

      playerUnits.forEach((u) => {
        const uProg = Math.min(1, t / combatDuration);
        const curHp = Math.round(u.initialHp - (u.initialHp - u.finalHp) * Math.pow(uProg, 1.2));
        const dead = curHp <= 0 || (u.destroyed && (u.timeOfDeathSec ?? 999) <= t);
        unitStates[u.id] = {
          hp: dead ? 0 : Math.max(1, curHp),
          maxHp: u.maxHp,
          destroyed: dead,
          damageDealt: Math.round(u.damageDealt * uProg),
          damageTaken: Math.round(u.damageTaken * uProg),
          shotsFired: Math.round(u.shotsFired * uProg),
          hitsLanded: Math.round(u.hitsLanded * uProg),
        };
      });

      enemyUnits.forEach((u) => {
        const uProg = Math.min(1, t / combatDuration);
        const curHp = Math.round(u.initialHp - (u.initialHp - u.finalHp) * Math.pow(uProg, 1.1));
        const dead = curHp <= 0 || (u.destroyed && (u.timeOfDeathSec ?? 999) <= t);
        unitStates[u.id] = {
          hp: dead ? 0 : Math.max(1, curHp),
          maxHp: u.maxHp,
          destroyed: dead,
          damageDealt: Math.round(u.damageDealt * uProg),
          damageTaken: Math.round(u.damageTaken * uProg),
          shotsFired: Math.round(u.shotsFired * uProg),
          hitsLanded: Math.round(u.hitsLanded * uProg),
        };
      });

      finalSnapshots.push({
        timeSec: t,
        playerTotalHp: Math.max(0, playerHpCurve),
        playerMaxHp: pTotalHp,
        enemyTotalHp: Math.max(0, enemyHpCurve),
        enemyMaxHp: eTotalHp,
        playerActiveCount: activePlayerUnits,
        enemyActiveCount: activeEnemyUnits,
        playerCumulativeDamage: Math.round(pTotalDamage * prog),
        enemyCumulativeDamage: Math.round(eTotalDamage * prog),
        playerDamageRate: Math.round((pTotalDamage / combatDuration) * (0.8 + Math.sin(prog * Math.PI) * 0.4)),
        enemyDamageRate: Math.round((eTotalDamage / combatDuration) * (0.8 + Math.cos(prog * Math.PI) * 0.3)),
        unitStates,
      });
    }
  }

  // 5. Ensure Milestones are rich and chronological
  const milestones: CombatMilestoneEvent[] =
    initialMilestones.length > 0
      ? [...initialMilestones].sort((a, b) => a.timeSec - b.timeSec)
      : [
          {
            id: 'ms_0',
            timeSec: 0.0,
            type: 'first_contact',
            title: 'Ballistic Engagement Commenced',
            description: 'Initial optical target acquisition. Both formations opened direct cannon and ATGM fire across mid-sector.',
            team: 'neutral',
            impactMagnitude: 'medium',
          },
          {
            id: 'ms_1',
            timeSec: Math.round(combatDuration * 0.25 * 10) / 10,
            type: 'fuel_explosion',
            title: 'Volatile JP-8 Fuel Tank Catastrophic Detonation',
            description: 'Direct APFSDS ricochet ignited forward fuel storage, triggering a 120m secondary shockwave that scorched opposing hulls.',
            team: 'player',
            impactMagnitude: 'high',
          },
          {
            id: 'ms_2',
            timeSec: Math.round(combatDuration * 0.48 * 10) / 10,
            type: 'cas_strike',
            title: 'A-10 Warthog Airstrike Ingress',
            description: 'Tactical air command conducted precision 30mm GAU-8 strafing run, shattering hostile frontline armor plates.',
            team: 'player',
            impactMagnitude: 'critical',
          },
          {
            id: 'ms_3',
            timeSec: Math.round(combatDuration * 0.72 * 10) / 10,
            type: 'kill',
            title: 'Hostile Flagship T-90M Penetrated & Neutralized',
            description: 'High-velocity kinetic dart pierced front composite turret cheek, igniting internal autoloader carousel.',
            team: 'player',
            impactMagnitude: 'critical',
          },
          {
            id: 'ms_4',
            timeSec: combatDuration,
            type: 'kill',
            title: result === 'victory' ? 'Hostile Forces Eliminated: Sector Secured' : 'Tactical Fallback: Heavy Losses Sustained',
            description:
              result === 'victory'
                ? 'Remaining hostile armor fled sector or collapsed into burning wreckage. Victory confirmed.'
                : 'Defensive line collapsed under concentrated enemy bombardment. Tactical retreat ordered.',
            team: result === 'victory' ? 'player' : 'enemy',
            impactMagnitude: 'critical',
          },
        ];

  return {
    battleId: `aar_${Date.now()}`,
    result,
    timestamp: new Date().toISOString(),
    durationSec: combatDuration,
    theaterName,
    playerSquadName,
    playerSquadPower,
    playerCommanderName,
    playerCommanderRank,
    enemyCommanderName,
    enemyCommanderServer,
    enemyCommanderFlag,
    enemySquadPower,
    snapshots: finalSnapshots,
    milestones,
    playerUnits,
    enemyUnits,
    comparativeMetrics,
    salvageRecovered: salvage,
  };
}
