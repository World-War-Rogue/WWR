/**
 * High-Visibility Military Terminal Reporter
 * Formats findings, scores, and battle statistics with tactical styling.
 */
export class TerminalReporter {
  constructor() {
    this.c = {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      amber: '\x1b[33m',
      red: '\x1b[31m',
      cyan: '\x1b[36m',
      gray: '\x1b[90m',
      bgDark: '\x1b[40m'
    };
  }

  printBanner() {
    console.log(`\n${this.c.bold}${this.c.green}================================================================================${this.c.reset}`);
    console.log(`${this.c.bold}${this.c.green}  [ A.E.G.I.S. ]  AUTONOMOUS ENGINE & GAME INTELLIGENCE SYSTEM                  ${this.c.reset}`);
    console.log(`${this.c.dim}${this.c.green}  CLASSIFIED MILITARY-GRADE GAME DESIGN, UI/UX, UPGRADES & COMPUTE AUDITOR      ${this.c.reset}`);
    console.log(`${this.c.bold}${this.c.green}================================================================================${this.c.reset}\n`);
  }

  printScorecard(scorecard) {
    const s = scorecard;
    const badgeColor = s.defconLevel === 4 ? this.c.green : s.defconLevel === 3 ? this.c.amber : this.c.red;

    console.log(`${this.c.bold}OVERALL GAME HEALTH SCORECARD:${this.c.reset}`);
    console.log(`┌─────────────────────────────────────────────────────────────┐`);
    console.log(`│ COMPOSITE HEALTH INDEX : ${this.c.bold}${badgeColor}${s.compositeScore}/100${this.c.reset}                                │`);
    console.log(`│ OPERATIONAL STATUS     : ${badgeColor}${s.defconStatus.padEnd(35)}${this.c.reset} │`);
    console.log(`├─────────────────────────────────────────────────────────────┤`);
    console.log(`│  • Game Design Balance : ${this.formatScore(s.pillars.gameDesign.score)} (Weight: ${s.pillars.gameDesign.weight})         │`);
    console.log(`│  • UI / UX Architecture : ${this.formatScore(s.pillars.uiUx.score)} (Weight: ${s.pillars.uiUx.weight})         │`);
    console.log(`│  • Upgrades & Scaling  : ${this.formatScore(s.pillars.upgrades.score)} (Weight: ${s.pillars.upgrades.weight})         │`);
    console.log(`│  • Computing & Frame   : ${this.formatScore(s.pillars.computing.score)} (Weight: ${s.pillars.computing.weight})         │`);
    console.log(`└─────────────────────────────────────────────────────────────┘\n`);
  }

  formatScore(score) {
    const color = score >= 85 ? this.c.green : score >= 70 ? this.c.amber : this.c.red;
    return `${color}${String(score).padStart(3)}/100${this.c.reset}`;
  }

  printDesignSummary(designReport) {
    console.log(`${this.c.bold}${this.c.cyan}[PILLAR 1: GAME DESIGN & BALANCE]${this.c.reset}`);
    const sum = designReport.summary;
    console.log(`  Units Analyzed: ${sum.totalUnits} across ${sum.erasCount} tech eras and ${sum.factionCount} nations`);
    console.log(`  Average Stats: EHP: ${sum.avgEHP} | Sustained DPS: ${sum.avgDPS} | Power Rating: ${sum.avgPower}`);
    console.log(`  Baseline Time-to-Kill (TTK): ${sum.baselineTTK} seconds`);

    if (designReport.topOverpoweredCandidates?.length > 0) {
      console.log(`  ${this.c.amber}Top Efficiency Outlier (Risk of Over-tuning):${this.c.reset} ${designReport.topOverpoweredCandidates[0].name} (Eff: ${designReport.topOverpoweredCandidates[0].powerEfficiency})`);
    }
    console.log('');
  }

  printUIUXSummary(uiReport) {
    console.log(`${this.c.bold}${this.c.cyan}[PILLAR 2: USER INTERFACE & UX ARCHITECTURE]${this.c.reset}`);
    const sum = uiReport.summary;
    console.log(`  Components Scanned: ${sum.totalComponents} | Avg Lines: ${sum.avgComponentLines}`);
    console.log(`  Interactive Elements: ${sum.totalInteractiveElements} | HUD Theme Adherence: ${sum.themeConformityRate}`);
    console.log(`  Oversized Components (>600 lines): ${sum.oversizedComponentsCount} | High State Density: ${sum.highHookDensityCount}`);
    if (uiReport.mostComplexComponents?.length > 0) {
      console.log(`  Top Complex View: ${uiReport.mostComplexComponents[0].name} (${uiReport.mostComplexComponents[0].lineCount} lines, ${uiReport.mostComplexComponents[0].interactiveElements} controls)`);
    }
    console.log('');
  }

  printUpgradesSummary(upgradesReport) {
    console.log(`${this.c.bold}${this.c.cyan}[PILLAR 3: UPGRADES & PROGRESSION SCALING]${this.c.reset}`);
    const sum = upgradesReport.summary;
    console.log(`  Base Buildings Analyzed: ${sum.analyzedBuildings} | Upgrade Tiers Simulated: ${sum.upgradeTiersSimulated}`);
    console.log(`  Average Upgrade ROI: ${sum.avgUpgradeROI} | Tech Eras: ${sum.techErasCount}`);
    console.log(`  Progression Anomalies: ${sum.trapsDetected} Substandard Traps | ${sum.runawayUpgradesDetected} Runaway Upgrades`);
    console.log('');
  }

  printComputingSummary(computeReport) {
    console.log(`${this.c.bold}${this.c.cyan}[PILLAR 4: COMPUTING & 60 FPS TICK BUDGET]${this.c.reset}`);
    const sum = computeReport.summary;
    const bb = computeReport.budgetBreakdown;
    const fpsColor = sum.estimatedFPS >= 55 ? this.c.green : sum.estimatedFPS >= 40 ? this.c.amber : this.c.red;

    console.log(`  Simulated Frame Time: ${sum.totalFrameTimeMs}ms / ${sum.targetBudgetMs}ms budget (${fpsColor}${sum.estimatedFPS} FPS Estimated${this.c.reset})`);
    console.log(`  Frame Budget Allocation:`);
    console.log(`    • Ballistics Raycasting : ${bb.physicsRaycastTimeMs}ms (Budget: ${bb.budgetAllocations.physicsAndBallistics}ms)`);
    console.log(`    • Squad AI & Swarm Tick : ${bb.aiDecisionTimeMs}ms (Budget: ${bb.budgetAllocations.squadAiAndSwarm}ms)`);
    console.log(`    • State Sync & Checksum : ${bb.stateSyncTimeMs}ms (Budget: ${bb.budgetAllocations.stateSyncAndReconciliation}ms)`);
    console.log(`    • React DOM / Canvas    : ${bb.domRenderTimeMs}ms (Budget: ${bb.budgetAllocations.reactRenderAndDom}ms)`);
    console.log(`  Render Churn: ${sum.totalUnmemoizedArrayOps} unmemoized array transforms inside JSX renders`);
    console.log('');
  }

  printMonteCarloResults(mc) {
    console.log(`${this.c.bold}${this.c.cyan}[HEADLESS MONTE CARLO SQUAD ENGAGEMENT SIMULATION]${this.c.reset}`);
    console.log(`  Total Battle Simulations: ${mc.totalSimulations.toLocaleString()} rounds`);
    for (const sq of mc.squadResults) {
      const winColor = sq.winRateRaw >= 65 ? this.c.green : sq.winRateRaw >= 45 ? this.c.cyan : this.c.amber;
      console.log(`  • ${sq.squadName.padEnd(20)} : Win Rate ${winColor}${sq.winRate.padEnd(6)}${this.c.reset} | Avg Ticks: ${sq.avgDurationTicks} | Status: [${sq.balanceStatus}]`);
    }
    console.log('');
  }

  printActionItems(matrix) {
    console.log(`${this.c.bold}${this.c.amber}[TACTICAL OPTIMIZATION ACTION MATRIX]${this.c.reset}`);
    console.log(`  Total Issues Detected: ${matrix.totalIssues} (Critical: ${matrix.counts.critical}, High: ${matrix.counts.high}, Medium: ${matrix.counts.medium}, Low: ${matrix.counts.low})\n`);

    const topIssues = matrix.rankedIssues.slice(0, 6);
    topIssues.forEach((issue, idx) => {
      const badge = issue.severity === 'CRITICAL' ? `${this.c.red}[CRITICAL]${this.c.reset}`
        : issue.severity === 'HIGH' ? `${this.c.red}[HIGH]${this.c.reset}`
        : issue.severity === 'MEDIUM' ? `${this.c.amber}[MEDIUM]${this.c.reset}`
        : `${this.c.gray}[LOW]${this.c.reset}`;

      console.log(`  ${idx + 1}. ${badge} ${this.c.bold}${issue.category}:${this.c.reset} ${issue.message}`);
    });
    console.log('');
  }
}
