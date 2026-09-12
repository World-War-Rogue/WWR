import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../src/config.mjs';
import { CodebaseScanner } from '../src/collector/codebase_scanner.mjs';
import { GameDataParser } from '../src/collector/game_data_parser.mjs';
import { GameDesignAnalyzer } from '../src/analyzers/game_design_analyzer.mjs';
import { UIUXAuditor } from '../src/analyzers/ui_ux_auditor.mjs';
import { UpgradesAnalyzer } from '../src/analyzers/upgrades_analyzer.mjs';
import { ComputingProfiler } from '../src/analyzers/computing_profiler.mjs';
import { CombatMonteCarloSimulator } from '../src/simulator/combat_monte_carlo.mjs';
import { EconomySimulator } from '../src/simulator/economy_simulator.mjs';
import { HealthScorecard } from '../src/reporting/health_scorecard.mjs';
import { RecommendationMatrix } from '../src/reporting/recommendation_matrix.mjs';
import { DashboardGenerator } from '../src/reporting/dashboard_generator.mjs';

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  RUNNING A.E.G.I.S. AUTOMATED VERIFICATION SUITE');
  console.log('======================================================\n');

  // Test 1: Parser & Fallback
  test('GameDataParser produces valid unit records', () => {
    const parser = new GameDataParser(CONFIG.targetGamePath);
    const fallback = parser.getFallbackUnits();
    assert.strictEqual(fallback.length >= 5, true);
    assert.strictEqual(fallback[0].id, 'us-m1a2-abrams');
    assert.strictEqual(typeof fallback[0].hp, 'number');
  });

  // Test 2: Game Design Analyzer
  test('GameDesignAnalyzer calculates EHP, DPS, TTK and composite score', () => {
    const analyzer = new GameDesignAnalyzer(CONFIG);
    const parser = new GameDataParser(CONFIG.targetGamePath);
    const units = parser.getFallbackUnits();
    const result = analyzer.analyze(units, []);

    assert.strictEqual(typeof result.score, 'number');
    assert.strictEqual(result.score > 0 && result.score <= 100, true);
    assert.strictEqual(result.summary.avgEHP > 0, true);
    assert.strictEqual(result.summary.avgDPS > 0, true);
    assert.strictEqual(result.summary.baselineTTK > 0, true);
  });

  // Test 3: UI/UX Auditor
  test('UIUXAuditor flags oversized components and verifies theme adherence', () => {
    const auditor = new UIUXAuditor(CONFIG);
    const mockComponents = [
      {
        name: 'TacticalHUD',
        lineCount: 250,
        hooks: { useState: 3, useEffect: 2, totalHooks: 5 },
        density: { totalInteractive: 18, modals: 1 },
        theme: { greenPhosphor: 12, amberAlert: 4, redDanger: 2 },
        performanceRisks: { unmemoizedArrayOps: 2, inlineHandlers: 4, intervals: 1 }
      },
      {
        name: 'MassiveView',
        lineCount: 850,
        hooks: { useState: 10, useEffect: 4, totalHooks: 14 },
        density: { totalInteractive: 35, modals: 3 },
        theme: { greenPhosphor: 0, amberAlert: 0, redDanger: 0 },
        performanceRisks: { unmemoizedArrayOps: 15, inlineHandlers: 20, intervals: 0 }
      }
    ];

    const result = auditor.audit(mockComponents);
    assert.strictEqual(result.summary.oversizedComponentsCount, 1);
    assert.strictEqual(result.summary.highHookDensityCount, 1);
    assert.strictEqual(result.issues.length >= 2, true);
  });

  // Test 4: Upgrades Analyzer
  test('UpgradesAnalyzer computes building upgrade ROI and detects traps', () => {
    const analyzer = new UpgradesAnalyzer(CONFIG);
    const result = analyzer.analyze([], []);

    assert.strictEqual(typeof result.score, 'number');
    assert.strictEqual(result.summary.upgradeTiersSimulated > 0, true);
    assert.strictEqual(result.buildingUpgrades.length > 0, true);
    assert.strictEqual(typeof result.buildingUpgrades[0].roi, 'number');
  });

  // Test 5: Computing Profiler
  test('ComputingProfiler calculates 16.6ms frame budget allocations', () => {
    const profiler = new ComputingProfiler(CONFIG);
    const mockComponents = [
      {
        name: 'CombatView',
        lineCount: 400,
        hooks: { useState: 4, useEffect: 1, totalHooks: 5 },
        density: { totalInteractive: 10, modals: 0 },
        theme: { greenPhosphor: 5, amberAlert: 2, redDanger: 1 },
        performanceRisks: { unmemoizedArrayOps: 8, inlineHandlers: 12, intervals: 0 }
      }
    ];

    const result = profiler.profile(mockComponents, 50);
    assert.strictEqual(result.summary.totalFrameTimeMs > 0, true);
    assert.strictEqual(result.summary.estimatedFPS > 0, true);
    assert.strictEqual(result.complexityChecks.length, 4);
  });

  // Test 6: Combat Monte Carlo Simulator
  test('CombatMonteCarloSimulator runs 1,000 battles and produces win rates', () => {
    const sim = new CombatMonteCarloSimulator({ rounds: 1000 });
    const result = sim.simulate();

    assert.strictEqual(result.squadResults.length, 4);
    assert.strictEqual(typeof result.squadResults[0].winRateRaw, 'number');
    assert.strictEqual(result.squadResults[0].winRateRaw >= 0, true);
  });

  // Test 7: Economy Simulator
  test('EconomySimulator models 100 days of resource survival', () => {
    const sim = new EconomySimulator({ days: 100, crisisIntervalDays: 7 });
    const result = sim.simulate();

    assert.strictEqual(result.simulatedDays, 100);
    assert.strictEqual(result.crisisSwarmTotalWaves > 0, true);
    assert.strictEqual(typeof result.finalResources.fuel, 'number');
  });

  // Test 8: Scorecard & Recommendation Matrix
  test('HealthScorecard computes DEFCON readiness rating accurately', () => {
    const scorecard = new HealthScorecard(CONFIG);
    const card = scorecard.compute({ gameDesign: 90, uiUx: 80, upgrades: 85, computing: 85 });

    assert.strictEqual(typeof card.compositeScore, 'number');
    assert.strictEqual(card.defconLevel, 3);
    assert.strictEqual(card.compositeScore, 85);
  });

  // Test 9: Dashboard & Dossier Generation
  test('DashboardGenerator writes HTML and Markdown artifacts', async () => {
    const gen = new DashboardGenerator(CONFIG);
    const mockPayload = {
      scorecard: { compositeScore: 88, defconStatus: 'DEFCON 3: GUARDED', defconLevel: 3, statusColor: '#eab308', pillars: { gameDesign: { score: 90, weight: '30%' }, uiUx: { score: 85, weight: '25%' }, upgrades: { score: 88, weight: '25%' }, computing: { score: 89, weight: '20%' } } },
      designReport: { summary: { totalUnits: 10, erasCount: 4, factionCount: 5, avgEHP: 2500, avgDPS: 350, avgPower: 800, baselineTTK: 7.1 }, topOverpoweredCandidates: [], topUnderpoweredCandidates: [], issues: [] },
      uiReport: { summary: { totalComponents: 5, avgComponentLines: 320, totalInteractiveElements: 45, themeConformityRate: '80%', oversizedComponentsCount: 0, highHookDensityCount: 0 }, mostComplexComponents: [], componentScores: [], issues: [] },
      upgradesReport: { summary: { analyzedBuildings: 3, upgradeTiersSimulated: 24, techErasCount: 4, avgUpgradeROI: '0.25', trapsDetected: 0, runawayUpgradesDetected: 0 }, buildingUpgrades: [], issues: [] },
      computeReport: { summary: { totalFrameTimeMs: 14.5, targetBudgetMs: 16.66, estimatedFPS: 60, totalUnmemoizedArrayOps: 4, totalInlineHandlers: 10, highRiskComponentsCount: 0 }, budgetBreakdown: { physicsRaycastTimeMs: 2.8, aiDecisionTimeMs: 3.2, stateSyncTimeMs: 1.2, domRenderTimeMs: 7.3, budgetAllocations: CONFIG.frameBudgetMs }, complexityChecks: [], highRiskComponents: [], issues: [] },
      monteCarlo: { totalSimulations: 1000, squadResults: [{ squadName: 'Alpha Spearhead', specialty: 'Frontal Breach', totalCombatPower: 5200, winRate: '72.5%', winRateRaw: 72.5, avgDurationTicks: 28, balanceStatus: 'BALANCED' }] },
      matrix: { totalIssues: 1, counts: { critical: 0, high: 0, medium: 1, low: 0 }, rankedIssues: [{ severity: 'MEDIUM', category: 'Balancing', message: 'Test issue message' }] }
    };

    const files = await gen.generateAll(mockPayload);
    assert.strictEqual(fs.existsSync(files.htmlPath), true);
    assert.strictEqual(fs.existsSync(files.mdPath), true);
  });

  console.log(`\n======================================================`);
  console.log(`  TEST RESULTS: ${passed}/${total} PASSED`);
  console.log(`======================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
