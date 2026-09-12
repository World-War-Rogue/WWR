/**
 * Survival Economy & Crisis Swarm Simulator
 * Models 100 days of resource production, maintenance consumption, and crisis swarm survival.
 */
export class EconomySimulator {
  constructor(options = {}) {
    this.days = options.days || 100;
    this.crisisIntervalDays = options.crisisIntervalDays || 7;
  }

  /**
   * Runs a 100-day economic projection.
   */
  simulate() {
    let resources = {
      fuel: 1200,
      alloy: 1500,
      munitions: 1000,
      food: 2000,
      techParts: 300
    };

    const dailyProduction = {
      fuel: 140,
      alloy: 160,
      munitions: 180,
      food: 220,
      techParts: 45
    };

    const dailyMaintenance = {
      fuel: 95,
      alloy: 80,
      munitions: 110,
      food: 150,
      techParts: 25
    };

    const dailyHistory = [];
    const crisisEvents = [];
    let survivalStatus = 'HEALTHY';
    let starvationDay = null;

    for (let day = 1; day <= this.days; day++) {
      // Base production
      for (const res of Object.keys(resources)) {
        resources[res] += dailyProduction[res];
      }

      // Base consumption
      for (const res of Object.keys(resources)) {
        resources[res] -= dailyMaintenance[res];
      }

      // Periodic Crisis Swarm attacks
      if (day % this.crisisIntervalDays === 0) {
        const waveIntensity = Math.floor(day / this.crisisIntervalDays);
        const munitionsBurn = 350 + (waveIntensity * 75);
        const alloyRepairs = 280 + (waveIntensity * 60);
        const fuelConsumption = 200 + (waveIntensity * 40);

        resources.munitions -= munitionsBurn;
        resources.alloy -= alloyRepairs;
        resources.fuel -= fuelConsumption;

        crisisEvents.push({
          day,
          waveNumber: waveIntensity,
          losses: { munitionsBurn, alloyRepairs, fuelConsumption },
          status: (resources.munitions >= 0 && resources.alloy >= 0) ? 'DEFENDED' : 'BREACHED'
        });
      }

      // Check for resource exhaustion / starvation cliff
      const isDeficit = Object.values(resources).some(val => val < 0);
      if (isDeficit && !starvationDay) {
        starvationDay = day;
        survivalStatus = 'RESOURCE_DEFICIT';
      }

      if (day % 10 === 0 || day === this.days) {
        dailyHistory.push({
          day,
          snapshot: { ...resources }
        });
      }
    }

    return {
      simulatedDays: this.days,
      finalStatus: survivalStatus,
      starvationDay,
      crisisSwarmTotalWaves: crisisEvents.length,
      finalResources: resources,
      historyMilestones: dailyHistory,
      crisisEvents: crisisEvents.slice(-5)
    };
  }
}
