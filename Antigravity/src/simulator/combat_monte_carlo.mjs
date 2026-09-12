/**
 * Headless Fast Monte Carlo Combat Simulator
 * Simulates thousands of squad engagements to gather empirical battle statistics and balance anomalies.
 */
export class CombatMonteCarloSimulator {
  constructor(options = {}) {
    this.rounds = options.rounds || 10000;
  }

  /**
   * Simulates N squad-vs-squad engagements.
   */
  simulate(squads = [], units = []) {
    const unitMap = new Map();
    for (const u of units) {
      unitMap.set(u.id, u);
    }

    const squadRoster = squads.length > 0 ? squads : this.getDefaultSquads();
    const results = [];

    // Enemy archetype templates
    const enemyArchetypes = [
      { name: 'Heavy Armor Vanguard', power: 5100, hp: 12000, dps: 1100, armorBonus: 0.25 },
      { name: 'Artillery Swarm Battery', power: 4900, hp: 8500, dps: 1600, armorBonus: 0.05 },
      { name: 'Air-Interdiction Strike Group', power: 5300, hp: 10000, dps: 1350, armorBonus: 0.15 },
      { name: 'Urban Insurgent Guerillas', power: 4400, hp: 7000, dps: 1250, armorBonus: 0.10 }
    ];

    for (const squad of squadRoster) {
      // Calculate squad base stats from its units
      let totalHp = 0;
      let totalDps = 0;
      let totalArmor = 0;
      const unitCount = (squad.unitIds || []).length || 5;

      for (const uId of squad.unitIds || []) {
        const u = unitMap.get(uId);
        if (u) {
          totalHp += (Number(u.hp) || 2000);
          totalDps += (Number(u.firepower) || 300) * (Number(u.fireRate) || 0.25);
          totalArmor += (Number(u.armor) || 40);
        } else {
          totalHp += 2000;
          totalDps += 150;
          totalArmor += 40;
        }
      }

      const avgArmor = totalArmor / Math.max(1, unitCount);
      const effectiveSquadHp = Math.round(totalHp * (1 + avgArmor / 100));

      let squadWins = 0;
      let squadLosses = 0;
      let totalTicks = 0;
      let squadSurvivorsSum = 0;

      const roundsPerSquad = Math.max(500, Math.floor(this.rounds / squadRoster.length));

      for (let r = 0; r < roundsPerSquad; r++) {
        // Pick random enemy archetype
        const enemy = enemyArchetypes[r % enemyArchetypes.length];
        
        let squadCurrentHp = effectiveSquadHp;
        let enemyCurrentHp = Math.round(enemy.hp * (1 + enemy.armorBonus));
        let tick = 0;

        // Simulate combat ticks until one side falls
        while (squadCurrentHp > 0 && enemyCurrentHp > 0 && tick < 120) {
          tick++;
          // Random roll for hit/miss/crit variance
          const squadRoll = 0.85 + (Math.random() * 0.30);
          const enemyRoll = 0.85 + (Math.random() * 0.30);

          const dmgToEnemy = totalDps * squadRoll;
          const dmgToSquad = enemy.dps * enemyRoll;

          enemyCurrentHp -= dmgToEnemy;
          squadCurrentHp -= dmgToSquad;
        }

        totalTicks += tick;

        if (squadCurrentHp > 0 && enemyCurrentHp <= 0) {
          squadWins++;
          const remainingPercent = Math.max(0.1, squadCurrentHp / effectiveSquadHp);
          squadSurvivorsSum += Math.round(unitCount * remainingPercent);
        } else {
          squadLosses++;
        }
      }

      const winRate = Math.round((squadWins / roundsPerSquad) * 1000) / 10;
      const avgDurationTicks = Math.round((totalTicks / roundsPerSquad) * 10) / 10;
      const avgSurvivors = Math.round((squadSurvivorsSum / Math.max(1, squadWins)) * 10) / 10;

      results.push({
        squadId: squad.id,
        squadName: squad.name,
        specialty: squad.tacticalSpecialty || 'Tactical Combat',
        totalCombatPower: squad.totalCombatPower || Math.round(effectiveSquadHp / 3),
        simulatedBattles: roundsPerSquad,
        wins: squadWins,
        losses: squadLosses,
        winRate: `${winRate}%`,
        winRateRaw: winRate,
        avgDurationTicks,
        avgSurvivorsOnWin: avgSurvivors,
        balanceStatus: winRate > 75 ? 'OVERPOWERED' : winRate < 35 ? 'UNDERPOWERED' : 'BALANCED'
      });
    }

    return {
      totalSimulations: this.rounds,
      squadResults: results,
      timestamp: new Date().toISOString()
    };
  }

  getDefaultSquads() {
    return [
      { id: 'squad_1', name: 'Alpha Spearhead', tacticalSpecialty: 'Heavy Frontal Breach', totalCombatPower: 5200, unitIds: ['us-m1a2-abrams', 'de-leopard-2a7'] },
      { id: 'squad_2', name: 'Bravo Siege', tacticalSpecialty: 'Ballistic Saturation', totalCombatPower: 5120, unitIds: ['de-pzh-2000'] },
      { id: 'squad_3', name: 'Charlie Recon', tacticalSpecialty: 'Flanking Ambush', totalCombatPower: 4890, unitIds: ['us-navy-seal-breacher'] },
      { id: 'squad_4', name: 'Delta Umbrella', tacticalSpecialty: 'Air Defense', totalCombatPower: 5260, unitIds: ['il-iron-dome'] }
    ];
  }
}
