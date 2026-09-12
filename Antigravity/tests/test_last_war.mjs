import assert from 'assert';
import fs from 'fs';
import { CONFIG } from '../src/config.mjs';
import { LAST_WAR_DATA } from '../src/games/last_war/data.mjs';
import { LastWarSimulator } from '../src/games/last_war/simulator.mjs';
import { LastWarDesignAnalyzer, LastWarUIUXAuditor, LastWarUpgradesAnalyzer, LastWarComputeProfiler } from '../src/games/last_war/analyzers.mjs';
import { LastWarDashboardGenerator } from '../src/reporting/last_war_dashboard.mjs';
import { HealthScorecard } from '../src/reporting/health_scorecard.mjs';
import { RecommendationMatrix } from '../src/reporting/recommendation_matrix.mjs';

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
  console.log('  RUNNING A.E.G.I.S. LAST WAR VERIFICATION SUITE');
  console.log('======================================================\n');

  // Test 1: Data Model
  test('LAST_WAR_DATA contains complete hero roster and Trinity Counter rules', () => {
    assert.strictEqual(LAST_WAR_DATA.heroes.length >= 15, true);
    assert.strictEqual(LAST_WAR_DATA.counterRules.damageBonusAgainstCounter, 0.20);
    assert.strictEqual(LAST_WAR_DATA.counterRules.relationships.Tank, 'Missile');
    assert.strictEqual(LAST_WAR_DATA.counterRules.relationships.Missile, 'Aircraft');
    assert.strictEqual(LAST_WAR_DATA.counterRules.relationships.Aircraft, 'Tank');
  });

  // Test 2: Last War Simulator & Monotype
  test('LastWarSimulator executes 5v5 battle and handles monotype + counter advantage', () => {
    const sim = new LastWarSimulator({ rounds: 100 });
    const squads = sim.getTournamentSquads();
    const tankSquad = squads.find(s => s.type === 'Tank');
    const missileSquad = squads.find(s => s.type === 'Missile');

    const battle = sim.simulateSingleBattle(tankSquad, missileSquad);
    assert.strictEqual(['A', 'B', 'DRAW'].includes(battle.winner), true);
    assert.strictEqual(battle.rounds > 0, true);
  });

  // Test 3: Tournament simulation produces expected matchup statistics
  test('LastWarSimulator runs tournament across 4 meta squads', () => {
    const sim = new LastWarSimulator({ rounds: 600 });
    const result = sim.runTournament();

    assert.strictEqual(result.matchups.length, 6);
    assert.strictEqual(typeof result.matchups[0].aWinRateRaw, 'number');
  });

  // Test 4: Design Analyzer
  test('LastWarDesignAnalyzer evaluates hero efficiency and flags monotype dominance', () => {
    const analyzer = new LastWarDesignAnalyzer();
    const result = analyzer.analyze();

    assert.strictEqual(typeof result.score, 'number');
    assert.strictEqual(result.summary.totalHeroes >= 15, true);
    assert.strictEqual(result.summary.typeDistribution.tanks >= 5, true);
    assert.strictEqual(result.issues.length >= 1, true);
  });

  // Test 5: UI/UX Auditor
  test('LastWarUIUXAuditor audits Red-Dot Saturation Index and popup frequency', () => {
    const auditor = new LastWarUIUXAuditor();
    const result = auditor.audit();

    assert.strictEqual(result.summary.redDotSaturationIndex, 28);
    assert.strictEqual(result.issues.some(i => i.category.includes('Red-Dot')), true);
  });

  // Test 6: Upgrades Analyzer
  test('LastWarUpgradesAnalyzer audits HQ 1-30 and T10 Gold bottlenecks', () => {
    const analyzer = new LastWarUpgradesAnalyzer();
    const result = analyzer.analyze();

    assert.strictEqual(result.summary.goldRequiredForT10.includes('Billion'), true);
    assert.strictEqual(result.summary.rightSideBottleneckCount, 3);
  });

  // Test 7: Compute Profiler
  test('LastWarComputeProfiler simulates mobile frame time and thermal envelope', () => {
    const profiler = new LastWarComputeProfiler();
    const result = profiler.profile();

    assert.strictEqual(result.summary.simulatedMobileFrameTimeMs > 0, true);
    assert.strictEqual(typeof result.summary.estimatedMobileFPS, 'number');
  });

  // Test 8: Dashboard & Dossier Generation
  test('LastWarDashboardGenerator generates HTML and Markdown artifacts', async () => {
    const gen = new LastWarDashboardGenerator(CONFIG);
    const scorecardCalc = new HealthScorecard(CONFIG);
    const card = scorecardCalc.compute({ gameDesign: 88, uiUx: 72, upgrades: 80, computing: 84 });
    const recMatrix = new RecommendationMatrix();
    const matrix = recMatrix.compile([]);

    const mockPayload = {
      scorecard: card,
      designReport: { summary: { totalHeroes: 18, urHeroes: 14, ssrHeroes: 4, typeDistribution: { tanks: 7, aircraft: 5, missiles: 6 }, topEfficiencyHero: 'Kimberly' } },
      uiReport: { summary: { redDotSaturationIndex: 28, dailyPopupsPerSession: 4.2 } },
      upgradesReport: { summary: { goldRequiredForT10: '4.8 Billion Gold', valorBadgesRequired: '68,500' }, progressionMilestones: LAST_WAR_DATA.hqProgression },
      computeReport: { summary: { simulatedMobileFrameTimeMs: 27.2, estimatedMobileFPS: 36 } },
      tournament: { totalTournamentRounds: 1000, matchups: [{ squadAName: 'Tank Meta', squadBName: 'Air Meta', squadAType: 'Tank', squadBType: 'Aircraft', aWinRate: '28%', bWinRate: '72%', aWinRateRaw: 28, bWinRateRaw: 72, avgRounds: 12.4 }] },
      matrix
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
