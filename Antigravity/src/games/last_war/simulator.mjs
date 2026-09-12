/**
 * Last War 5v5 Squad Combat & Monte Carlo Tournament Simulator
 * Implements real Last War mechanics: 2-Front/3-Back formation, Energy Skills,
 * Monotype +20% buff, and the Tank-Aircraft-Missile +20%/-20% counter triangle.
 */
import { LAST_WAR_DATA } from './data.mjs';

export class LastWarSimulator {
  constructor(options = {}) {
    this.rounds = options.rounds || 10000;
    this.rules = LAST_WAR_DATA.counterRules;
    this.heroMap = new Map();
    for (const h of LAST_WAR_DATA.heroes) {
      this.heroMap.set(h.id, h);
    }
  }

  /**
   * Builds the 4 standard meta tournament lineups.
   */
  getTournamentSquads() {
    return [
      {
        id: 'meta-tank',
        name: 'Pure Tank Meta (Season 0/1 Dominant)',
        type: 'Tank',
        frontLine: ['tank-murphy', 'tank-williams'],
        backLine: ['tank-kimberly', 'tank-marshall', 'tank-stetmann'],
        description: 'The golden standard early-to-midgame squad: double defensive frontline with Kimberly & Stetmann burst, boosted by Marshall crit.'
      },
      {
        id: 'meta-aircraft',
        name: 'Pure Aircraft Meta (Anti-Tank Counter)',
        type: 'Aircraft',
        frontLine: ['air-carlie', 'air-lucius'],
        backLine: ['air-dva', 'air-morrison', 'air-schuyler'],
        description: 'The premier late-game meta squad built to hard-counter Tank squads with DVA missile barrages and Lucius energy absorption.'
      },
      {
        id: 'meta-missile',
        name: 'Pure Missile Meta (Anti-Air Counter)',
        type: 'Missile',
        frontLine: ['missile-mcgregor', 'missile-tesla'], // Tesla hybrid / McGregor
        backLine: ['missile-fiona', 'missile-swift', 'missile-venom'],
        description: 'Hard counter to Aircraft squads utilizing Tesla chain lightning overload and high armor penetration.'
      },
      {
        id: 'hybrid-mixed',
        name: 'Mixed Sub-Optimal Squad (No Monotype)',
        type: 'Mixed',
        frontLine: ['tank-murphy', 'air-carlie'],
        backLine: ['tank-kimberly', 'air-dva', 'missile-tesla'],
        description: 'A rainbow hybrid lineup lacking the 20% monotype stat synergy.'
      }
    ];
  }

  /**
   * Simulates a single battle between two 5-hero squads.
   */
  simulateSingleBattle(squadA, squadB) {
    // Clone heroes and calculate monotype bonuses
    const teamA = this.instantiateTeam(squadA, squadB.type);
    const teamB = this.instantiateTeam(squadB, squadA.type);

    let round = 0;
    const maxRounds = 30; // Max battle rounds before timeout

    while (this.isTeamAlive(teamA) && this.isTeamAlive(teamB) && round < maxRounds) {
      round++;

      // Phase 1: Team A attacks Team B
      this.executeTeamTurn(teamA, teamB);

      // Check if Team B wiped out
      if (!this.isTeamAlive(teamB)) break;

      // Phase 2: Team B attacks Team A
      this.executeTeamTurn(teamB, teamA);
    }

    const aAlive = this.isTeamAlive(teamA);
    const bAlive = this.isTeamAlive(teamB);

    return {
      winner: aAlive && !bAlive ? 'A' : bAlive && !aAlive ? 'B' : 'DRAW',
      rounds: round,
      teamASurvivors: teamA.heroes.filter(h => h.currentHp > 0).length,
      teamBSurvivors: teamB.heroes.filter(h => h.currentHp > 0).length
    };
  }

  /**
   * Executes one side's offensive turn with normal attacks and energy skills.
   */
  executeTeamTurn(attackerTeam, defenderTeam) {
    for (const hero of attackerTeam.heroes) {
      if (hero.currentHp <= 0) continue;

      // Find valid target in defender team (Frontline prioritized first)
      const target = this.selectTarget(defenderTeam);
      if (!target) break;

      // Check for Ultimate Energy Skill
      let isSkill = false;
      let damageMultiplier = 1.0;

      if (hero.energy >= 1000) {
        isSkill = true;
        hero.energy = 0; // Discharge energy
        damageMultiplier = hero.data.skillMultiplier || 3.0;
      } else {
        // Normal attack generates 150 energy
        hero.energy = Math.min(1000, hero.energy + 150);
      }

      // Base damage calculation
      const baseAtk = hero.attack;
      const defReduction = target.defense / (target.defense + 30000);
      let rawDamage = baseAtk * (1 - defReduction) * damageMultiplier;

      // Apply Counter Triangle Bonus (+20% dealt / -20% received)
      if (hero.hasTypeAdvantage) {
        rawDamage *= (1 + this.rules.damageBonusAgainstCounter); // +20%
      } else if (hero.hasTypeDisadvantage) {
        rawDamage *= (1 - this.rules.damageMitigationFromCounter); // -20%
      }

      // Critical Hit roll
      const isCrit = Math.random() < hero.critRate;
      if (isCrit) {
        rawDamage *= 1.5;
      }

      // Deflection roll
      const isDeflected = Math.random() < target.deflectionRate;
      if (isDeflected) {
        rawDamage *= 0.6;
      }

      const finalDamage = Math.max(500, Math.round(rawDamage));
      target.currentHp -= finalDamage;

      // Target generates 100 energy upon taking damage
      target.energy = Math.min(1000, target.energy + 100);
    }
  }

  selectTarget(defenderTeam) {
    // Frontline defenders first
    const livingFront = defenderTeam.heroes.filter(h => h.isFront && h.currentHp > 0);
    if (livingFront.length > 0) {
      return livingFront[Math.floor(Math.random() * livingFront.length)];
    }
    // Then backline
    const livingBack = defenderTeam.heroes.filter(h => !h.isFront && h.currentHp > 0);
    if (livingBack.length > 0) {
      return livingBack[Math.floor(Math.random() * livingBack.length)];
    }
    return null;
  }

  isTeamAlive(team) {
    return team.heroes.some(h => h.currentHp > 0);
  }

  instantiateTeam(squad, enemySquadType) {
    const isMonotype = squad.type !== 'Mixed';
    const monotypeBonus = isMonotype ? this.rules.monotypeBonus5Heroes : 0; // +20% for 5 of same type

    const hasTypeAdvantage = this.rules.relationships[squad.type] === enemySquadType;
    const hasTypeDisadvantage = this.rules.relationships[enemySquadType] === squad.type;

    const heroes = [];

    // Frontline
    for (const hId of squad.frontLine) {
      const data = this.heroMap.get(hId);
      if (data) {
        heroes.push({
          id: hId,
          data,
          isFront: true,
          currentHp: Math.round(data.baseHp * (1 + monotypeBonus)),
          maxHp: Math.round(data.baseHp * (1 + monotypeBonus)),
          attack: Math.round(data.baseAttack * (1 + monotypeBonus)),
          defense: Math.round(data.baseDefense * (1 + monotypeBonus)),
          critRate: data.critRate,
          deflectionRate: data.deflectionRate,
          energy: 0,
          hasTypeAdvantage,
          hasTypeDisadvantage
        });
      }
    }

    // Backline
    for (const hId of squad.backLine) {
      const data = this.heroMap.get(hId);
      if (data) {
        heroes.push({
          id: hId,
          data,
          isFront: false,
          currentHp: Math.round(data.baseHp * (1 + monotypeBonus)),
          maxHp: Math.round(data.baseHp * (1 + monotypeBonus)),
          attack: Math.round(data.baseAttack * (1 + monotypeBonus)),
          defense: Math.round(data.baseDefense * (1 + monotypeBonus)),
          critRate: data.critRate,
          deflectionRate: data.deflectionRate,
          energy: 0,
          hasTypeAdvantage,
          hasTypeDisadvantage
        });
      }
    }

    return { squad, heroes };
  }

  /**
   * Executes a full round-robin tournament (10,000 matches total).
   */
  runTournament() {
    const squads = this.getTournamentSquads();
    const matchups = [];

    // Pairwise matchups
    for (let i = 0; i < squads.length; i++) {
      for (let j = i + 1; j < squads.length; j++) {
        matchups.push({ squadA: squads[i], squadB: squads[j] });
      }
    }

    const roundsPerMatchup = Math.floor(this.rounds / matchups.length);
    const tournamentResults = [];

    for (const m of matchups) {
      let aWins = 0;
      let bWins = 0;
      let draws = 0;
      let totalRounds = 0;

      for (let r = 0; r < roundsPerMatchup; r++) {
        const battle = this.simulateSingleBattle(m.squadA, m.squadB);
        totalRounds += battle.rounds;
        if (battle.winner === 'A') aWins++;
        else if (battle.winner === 'B') bWins++;
        else draws++;
      }

      const aWinRate = Math.round((aWins / roundsPerMatchup) * 1000) / 10;
      const bWinRate = Math.round((bWins / roundsPerMatchup) * 1000) / 10;

      tournamentResults.push({
        matchupKey: `${m.squadA.id}_vs_${m.squadB.id}`,
        squadAName: m.squadA.name,
        squadBName: m.squadB.name,
        squadAType: m.squadA.type,
        squadBType: m.squadB.type,
        roundsSimulated: roundsPerMatchup,
        aWins,
        bWins,
        draws,
        aWinRate: `${aWinRate}%`,
        bWinRate: `${bWinRate}%`,
        aWinRateRaw: aWinRate,
        bWinRateRaw: bWinRate,
        avgRounds: Math.round((totalRounds / roundsPerMatchup) * 10) / 10
      });
    }

    return {
      totalTournamentRounds: this.rounds,
      matchups: tournamentResults,
      timestamp: new Date().toISOString()
    };
  }
}
