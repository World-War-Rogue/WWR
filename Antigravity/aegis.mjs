#!/usr/bin/env node
import path from 'path';
import { CONFIG } from './src/config.mjs';
import { TelemetryHarvester } from './src/collector/telemetry_harvester.mjs';
import { GameDesignAnalyzer } from './src/analyzers/game_design_analyzer.mjs';
import { UIUXAuditor } from './src/analyzers/ui_ux_auditor.mjs';
import { UpgradesAnalyzer } from './src/analyzers/upgrades_analyzer.mjs';
import { ComputingProfiler } from './src/analyzers/computing_profiler.mjs';
import { CombatMonteCarloSimulator } from './src/simulator/combat_monte_carlo.mjs';
import { EconomySimulator } from './src/simulator/economy_simulator.mjs';
import { HealthScorecard } from './src/reporting/health_scorecard.mjs';
import { RecommendationMatrix } from './src/reporting/recommendation_matrix.mjs';
import { TerminalReporter } from './src/reporting/terminal_reporter.mjs';
import { DashboardGenerator } from './src/reporting/dashboard_generator.mjs';

// Last War imports
import { LastWarSimulator } from './src/games/last_war/simulator.mjs';
import { LastWarDesignAnalyzer, LastWarUIUXAuditor, LastWarUpgradesAnalyzer, LastWarComputeProfiler } from './src/games/last_war/analyzers.mjs';
import { LastWarDashboardGenerator } from './src/reporting/last_war_dashboard.mjs';

/**
 * A.E.G.I.S. Multi-Game Engine Orchestrator
 */
export class AegisEngine {
  constructor(customConfig = {}) {
    this.config = { ...CONFIG, ...customConfig };
    this.reporter = new TerminalReporter();
  }

  async run(game = 'world-war-rogue', command = 'all') {
    if (game.toLowerCase().includes('last-war') || game.toLowerCase().includes('lastwar')) {
      return this.runLastWar(command);
    }
    return this.runWorldWarRogue(command);
  }

  /**
   * Executes analysis and simulation for Last War: Survival Game
   */
  async runLastWar(command = 'all') {
    this.reporter.printBanner();
    console.log(`[+] Initializing A.E.G.I.S. analysis for: LAST WAR: SURVIVAL GAME (FirstFun)...`);
    console.log(`[✓] Ingested 18 UR/SSR heroes, HQ 1-30 progression, Drone 6-slot matrix, and Trinity Counter rules.\n`);

    const designAnalyzer = new LastWarDesignAnalyzer();
    const uiAuditor = new LastWarUIUXAuditor();
    const upgradesAnalyzer = new LastWarUpgradesAnalyzer();
    const computeProfiler = new LastWarComputeProfiler();
    const sim = new LastWarSimulator({ rounds: 10000 });
    const scorecardCalc = new HealthScorecard(this.config);
    const recMatrix = new RecommendationMatrix();
    const dashboardGen = new LastWarDashboardGenerator(this.config);

    // 1. Analyzers
    const designReport = designAnalyzer.analyze();
    const uiReport = uiAuditor.audit();
    const upgradesReport = upgradesAnalyzer.analyze();
    const computeReport = computeProfiler.profile();

    // 2. Tournament Simulations
    console.log(`[+] Running 10,000-Battle Headless Monte Carlo Tournament across Tank, Aircraft, and Missile metas...`);
    const tournament = sim.runTournament();
    console.log(`[✓] Tournament simulation complete.\n`);

    // 3. Health Scorecard & Recommendation Matrix
    const card = scorecardCalc.compute({
      gameDesign: designReport.score,
      uiUx: uiReport.score,
      upgrades: upgradesReport.score,
      computing: computeReport.score
    });

    const matrix = recMatrix.compile([
      designReport.issues,
      uiReport.issues,
      upgradesReport.issues,
      computeReport.issues
    ]);

    const payload = {
      scorecard: card,
      designReport,
      uiReport,
      upgradesReport,
      computeReport,
      tournament,
      matrix
    };

    // 4. Save Artifacts
    const generatedDocs = await dashboardGen.generateAll(payload);

    // 5. Terminal Presentation
    this.reporter.printScorecard(card);

    console.log(`\x1b[1m\x1b[36m[PILLAR 1: LAST WAR TRINITY COUNTER & HERO BALANCE]\x1b[0m`);
    console.log(`  Heroes Evaluated: ${designReport.summary.totalHeroes} (${designReport.summary.urHeroes} UR / ${designReport.summary.ssrHeroes} SSR)`);
    console.log(`  Roster Split: ${designReport.summary.typeDistribution.tanks} Tanks | ${designReport.summary.typeDistribution.aircraft} Aircraft | ${designReport.summary.typeDistribution.missiles} Missiles`);
    console.log(`  Top Efficiency Outlier: ${designReport.summary.topEfficiencyHero}`);
    console.log(`  Counter Rule: Tank beats Missile (+20%), Missile beats Aircraft (+20%), Aircraft beats Tank (+20%)\n`);

    console.log(`\x1b[1m\x1b[36m[PILLAR 2: MOBILE UI / UX & RED-DOT SATURATION]\x1b[0m`);
    console.log(`  Red-Dot Saturation Index: \x1b[31m\x1b[1m${uiReport.summary.redDotSaturationIndex} simultaneous alerts\x1b[0m (Extreme cognitive friction)`);
    console.log(`  Microtransaction Popups: ${uiReport.summary.dailyPopupsPerSession} per session | Orientation: ${uiReport.summary.orientation}\n`);

    console.log(`\x1b[1m\x1b[36m[PILLAR 3: UPGRADES & THE T10 SPECIAL FORCES GOLD WALL]\x1b[0m`);
    console.log(`  T10 Unit X Prerequisites: ${upgradesReport.summary.t10TroopPrerequisites}`);
    console.log(`  Gold Required for T10: \x1b[33m\x1b[1m${upgradesReport.summary.goldRequiredForT10}\x1b[0m | Valor Badges: ${upgradesReport.summary.valorBadgesRequired}`);
    console.log(`  Drone Drop Scarcity: Right-side components drop at only 15% vs 35% left-side\n`);

    console.log(`\x1b[1m\x1b[36m[PILLAR 4: MOBILE COMPUTING & THERMAL ENVELOPE]\x1b[0m`);
    console.log(`  Simulated Mobile Frame Time: ${computeReport.summary.simulatedMobileFrameTimeMs}ms (Target: ${computeReport.summary.target60fpsBudgetMs}ms 60 FPS / ${computeReport.summary.target30fpsBudgetMs}ms 30 FPS)`);
    console.log(`  Estimated Mobile FPS: ~${computeReport.summary.estimatedMobileFPS} FPS | Thermal Risk: ${computeReport.summary.thermalRiskLevel}\n`);

    console.log(`\x1b[1m\x1b[36m[HEADLESS MONTE CARLO SQUAD TOURNAMENT RESULTS (10,000 ROUNDS)]\x1b[0m`);
    for (const m of tournament.matchups) {
      console.log(`  • ${m.squadAType.padEnd(8)} vs ${m.squadBType.padEnd(8)} : ${m.aWinRate.padEnd(6)} vs ${m.bWinRate.padEnd(6)} | Avg Rounds: ${m.avgRounds}`);
    }
    console.log('');

    this.reporter.printActionItems(matrix);

    console.log(`[✓] Interactive Visual Dashboard generated: ${generatedDocs.htmlPath}`);
    console.log(`[✓] Tactical Intelligence Dossier generated: ${generatedDocs.mdPath}\n`);

    return payload;
  }

  /**
   * Executes analysis and simulation for World War Rogue
   */
  async runWorldWarRogue(command = 'all') {
    this.reporter.printBanner();
    console.log(`[+] Initializing data harvest from: ${this.config.targetGamePath}...`);
    const harvester = new TelemetryHarvester(this.config);
    const telemetry = await harvester.harvestAll();
    console.log(`[✓] Harvest complete. Discovered ${telemetry.units.length} units, ${telemetry.components.length} React components, and ${telemetry.dossiers.length} design dossiers.\n`);

    const designAnalyzer = new GameDesignAnalyzer(this.config);
    const uiAuditor = new UIUXAuditor(this.config);
    const upgradesAnalyzer = new UpgradesAnalyzer(this.config);
    const computeProfiler = new ComputingProfiler(this.config);
    const combatSim = new CombatMonteCarloSimulator(this.config.simulation);
    const economySim = new EconomySimulator(this.config.simulation);
    const scorecardCalc = new HealthScorecard(this.config);
    const recMatrix = new RecommendationMatrix();
    const dashboardGen = new DashboardGenerator(this.config);

    const designReport = designAnalyzer.analyze(telemetry.units, telemetry.dossiers);
    const uiReport = uiAuditor.audit(telemetry.components);
    const upgradesReport = upgradesAnalyzer.analyze(telemetry.buildings, telemetry.units);
    const computeReport = computeProfiler.profile(telemetry.components, telemetry.units.length);

    console.log(`[+] Running Headless Monte Carlo Simulation (${this.config.simulation.monteCarloDefaultRounds} rounds)...`);
    const monteCarlo = combatSim.simulate(telemetry.squads, telemetry.units);
    const economyReport = economySim.simulate();
    console.log(`[✓] Simulations complete.\n`);

    const card = scorecardCalc.compute({
      gameDesign: designReport.score,
      uiUx: uiReport.score,
      upgrades: upgradesReport.score,
      computing: computeReport.score
    });

    const matrix = recMatrix.compile([
      designReport.issues,
      uiReport.issues,
      upgradesReport.issues,
      computeReport.issues
    ]);

    const payload = {
      scorecard: card,
      designReport,
      uiReport,
      upgradesReport,
      computeReport,
      monteCarlo,
      economyReport,
      matrix,
      telemetry
    };

    const telemetryJsonPath = path.join(this.config.reportsDir, 'telemetry_data.json');
    await harvester.saveTelemetry(payload, telemetryJsonPath);

    const generatedDocs = await dashboardGen.generateAll(payload);

    this.reporter.printScorecard(card);
    if (command === 'all' || command === 'analyze') {
      this.reporter.printDesignSummary(designReport);
      this.reporter.printUIUXSummary(uiReport);
      this.reporter.printUpgradesSummary(upgradesReport);
      this.reporter.printComputingSummary(computeReport);
    }
    if (command === 'all' || command === 'simulate') {
      this.reporter.printMonteCarloResults(monteCarlo);
    }
    this.reporter.printActionItems(matrix);

    console.log(`[✓] Interactive Visual Dashboard generated: ${generatedDocs.htmlPath}`);
    console.log(`[✓] Tactical Intelligence Dossier generated: ${generatedDocs.mdPath}`);
    console.log(`[✓] Raw Telemetry Dataset saved: ${telemetryJsonPath}\n`);

    return payload;
  }
}

// Parse CLI flags
const args = process.argv.slice(2);
let selectedGame = 'world-war-rogue';
let selectedCommand = 'all';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--game' || args[i] === '-g') {
    selectedGame = args[i + 1] || 'last-war';
    i++;
  } else if (!args[i].startsWith('-')) {
    selectedCommand = args[i];
  }
}

const engine = new AegisEngine();
engine.run(selectedGame, selectedCommand).catch(err => {
  console.error('[!] Error executing A.E.G.I.S. pipeline:', err);
  process.exit(1);
});
