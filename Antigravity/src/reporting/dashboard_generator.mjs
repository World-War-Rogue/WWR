import fs from 'fs';
import path from 'path';

/**
 * Generates interactive visual HTML dashboards and markdown dossiers.
 */
export class DashboardGenerator {
  constructor(config) {
    this.config = config;
    this.reportsDir = config.reportsDir;
  }

  async generateAll(payload) {
    if (!fs.existsSync(this.reportsDir)) {
      await fs.promises.mkdir(this.reportsDir, { recursive: true });
    }

    const htmlPath = path.join(this.reportsDir, 'dashboard.html');
    const mdPath = path.join(this.reportsDir, 'game_health_dossier.md');

    const htmlContent = this.generateHtmlDashboard(payload);
    const mdContent = this.generateMarkdownDossier(payload);

    await fs.promises.writeFile(htmlPath, htmlContent, 'utf8');
    await fs.promises.writeFile(mdPath, mdContent, 'utf8');

    return { htmlPath, mdPath };
  }

  generateHtmlDashboard(data) {
    const { scorecard, designReport, uiReport, upgradesReport, computeReport, monteCarlo, matrix } = data;

    const radarDesign = scorecard.pillars.gameDesign.score;
    const radarUi = scorecard.pillars.uiUx.score;
    const radarUpgrades = scorecard.pillars.upgrades.score;
    const radarCompute = scorecard.pillars.computing.score;

    // Calculate 4-axis SVG radar polygon points (center 150, 150, radius 100)
    const cx = 150, cy = 150, rMax = 110;
    const pNorth = [cx, cy - (rMax * (radarDesign / 100))];
    const pEast  = [cx + (rMax * (radarUi / 100)), cy];
    const pSouth = [cx, cy + (rMax * (radarUpgrades / 100))];
    const pWest  = [cx - (rMax * (radarCompute / 100)), cy];
    const radarPolygon = `${pNorth[0]},${pNorth[1]} ${pEast[0]},${pEast[1]} ${pSouth[0]},${pSouth[1]} ${pWest[0]},${pWest[1]}`;

    // Top units for scatter plot
    const topUnitsJson = JSON.stringify((designReport.topOverpoweredCandidates || []).concat(designReport.topUnderpoweredCandidates || []));
    const compScoresJson = JSON.stringify((uiReport.componentScores || []).slice(0, 15));

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A.E.G.I.S. // Game Intelligence Tactical Dashboard</title>
  <style>
    :root {
      --bg-base: #0a0f18;
      --bg-card: #111a2e;
      --border-hud: #1e293b;
      --green-phosphor: #22c55e;
      --green-glow: rgba(34, 197, 94, 0.25);
      --amber-alert: #f59e0b;
      --red-threat: #ef4444;
      --cyan-telemetry: #06b6d4;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      background-color: var(--bg-base);
      color: var(--text-main);
      line-height: 1.5;
      padding: 24px;
    }

    /* Scanline effect */
    body::before {
      content: " ";
      position: fixed;
      top: 0; left: 0; bottom: 0; right: 0;
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
      z-index: 999;
      background-size: 100% 3px, 6px 100%;
      pointer-events: none;
      opacity: 0.6;
    }

    .header-bar {
      border: 1px solid var(--border-hud);
      background: var(--bg-card);
      padding: 20px 24px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }

    .title-box h1 {
      font-size: 1.5rem;
      letter-spacing: 2px;
      color: var(--green-phosphor);
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .title-box p {
      color: var(--text-muted);
      font-size: 0.85rem;
      letter-spacing: 1px;
    }

    .defcon-badge {
      padding: 10px 18px;
      border-radius: 4px;
      font-weight: 700;
      letter-spacing: 1px;
      font-size: 0.9rem;
      border: 1px solid ${scorecard.statusColor};
      color: ${scorecard.statusColor};
      background: rgba(0,0,0,0.4);
      box-shadow: 0 0 15px ${scorecard.statusColor}33;
    }

    /* Grid Layout */
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 20px;
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-hud);
      border-radius: 6px;
      padding: 20px;
    }

    .card-title {
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--cyan-telemetry);
      margin-bottom: 16px;
      border-bottom: 1px solid var(--border-hud);
      padding-bottom: 8px;
      display: flex;
      justify-content: space-between;
    }

    .col-4 { grid-column: span 4; }
    .col-6 { grid-column: span 6; }
    .col-8 { grid-column: span 8; }
    .col-12 { grid-column: span 12; }

    /* Radar Chart */
    .radar-container {
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }

    /* Metrics stat boxes */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat-box {
      background: rgba(0,0,0,0.3);
      border: 1px solid var(--border-hud);
      padding: 12px;
      border-radius: 4px;
      text-align: center;
    }
    .stat-val {
      font-size: 1.4rem;
      font-weight: bold;
      color: var(--green-phosphor);
    }
    .stat-lbl {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    /* Budget Waterfall */
    .waterfall-bar {
      height: 24px;
      display: flex;
      border-radius: 4px;
      overflow: hidden;
      margin: 12px 0;
      border: 1px solid var(--border-hud);
    }
    .wf-segment {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      font-weight: bold;
      color: #000;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    th, td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border-hud);
    }
    th {
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 0.75rem;
    }
    tr:hover { background: rgba(255,255,255,0.03); }

    .badge {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.7rem;
      font-weight: 700;
    }
    .badge-critical { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid #ef4444; }
    .badge-high { background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid #f87171; }
    .badge-med { background: rgba(245,158,11,0.2); color: #f59e0b; border: 1px solid #f59e0b; }
    .badge-low { background: rgba(148,163,184,0.2); color: #94a3b8; border: 1px solid #94a3b8; }

    @media (max-width: 900px) {
      .col-4, .col-6, .col-8 { grid-column: span 12; }
      .stats-row { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>

  <!-- Top Header -->
  <header class="header-bar">
    <div class="title-box">
      <h1><span style="display:inline-block; width:12px; height:12px; background:var(--green-phosphor); border-radius:50%; box-shadow:0 0 8px var(--green-phosphor);"></span> A.E.G.I.S. Game Intelligence System</h1>
      <p>Target: WORLD WAR ROGUE // Timestamp: ${new Date().toISOString()} // Version 1.0.0</p>
    </div>
    <div class="defcon-badge">
      ${scorecard.defconStatus} [${scorecard.compositeScore}/100]
    </div>
  </header>

  <!-- Main Dashboard Grid -->
  <main class="dashboard-grid">

    <!-- Pillar 1: Health Radar Chart -->
    <div class="card col-4">
      <div class="card-title">
        <span>System Radar</span>
        <span style="color:var(--green-phosphor);">${scorecard.compositeScore} PTS</span>
      </div>
      <div class="radar-container">
        <svg width="300" height="300" viewBox="0 0 300 300">
          <!-- Background Webs -->
          <circle cx="150" cy="150" r="110" fill="none" stroke="#1e293b" stroke-width="1" />
          <circle cx="150" cy="150" r="82.5" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="3,3" />
          <circle cx="150" cy="150" r="55" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="3,3" />
          <circle cx="150" cy="150" r="27.5" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="3,3" />
          <!-- Axes -->
          <line x1="150" y1="40" x2="150" y2="260" stroke="#334155" stroke-width="1" />
          <line x1="40" y1="150" x2="260" y2="150" stroke="#334155" stroke-width="1" />
          <!-- Polygon -->
          <polygon points="${radarPolygon}" fill="rgba(34, 197, 94, 0.25)" stroke="#22c55e" stroke-width="2" />
          <!-- Axis Labels -->
          <text x="150" y="28" text-anchor="middle" fill="#94a3b8" font-size="10">DESIGN (${radarDesign})</text>
          <text x="275" y="154" text-anchor="start" fill="#94a3b8" font-size="10">UI/UX (${radarUi})</text>
          <text x="150" y="280" text-anchor="middle" fill="#94a3b8" font-size="10">UPGRADES (${radarUpgrades})</text>
          <text x="25" y="154" text-anchor="end" fill="#94a3b8" font-size="10">COMPUTE (${radarCompute})</text>
        </svg>
      </div>
    </div>

    <!-- Pillar 2: Computing & Frame Budget Waterfall -->
    <div class="card col-8">
      <div class="card-title">
        <span>Computing & 60 FPS Frame Budget (16.66ms)</span>
        <span style="color:${computeReport.summary.estimatedFPS >= 50 ? 'var(--green-phosphor)' : 'var(--amber-alert)'};">
          ~${computeReport.summary.estimatedFPS} FPS (${computeReport.summary.totalFrameTimeMs}ms)
        </span>
      </div>
      <div class="stats-row">
        <div class="stat-box">
          <div class="stat-val">${computeReport.budgetBreakdown.physicsRaycastTimeMs}ms</div>
          <div class="stat-lbl">Raycast / Ballistics</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${computeReport.budgetBreakdown.aiDecisionTimeMs}ms</div>
          <div class="stat-lbl">AI & Swarm Tick</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${computeReport.budgetBreakdown.stateSyncTimeMs}ms</div>
          <div class="stat-lbl">State Checksum</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${computeReport.budgetBreakdown.domRenderTimeMs}ms</div>
          <div class="stat-lbl">React DOM Render</div>
        </div>
      </div>
      <div class="waterfall-bar">
        <div class="wf-segment" style="width: ${(computeReport.budgetBreakdown.physicsRaycastTimeMs / computeReport.summary.totalFrameTimeMs) * 100}%; background: #38bdf8;">Raycast</div>
        <div class="wf-segment" style="width: ${(computeReport.budgetBreakdown.aiDecisionTimeMs / computeReport.summary.totalFrameTimeMs) * 100}%; background: #a855f7;">AI</div>
        <div class="wf-segment" style="width: ${(computeReport.budgetBreakdown.stateSyncTimeMs / computeReport.summary.totalFrameTimeMs) * 100}%; background: #f59e0b;">Sync</div>
        <div class="wf-segment" style="width: ${(computeReport.budgetBreakdown.domRenderTimeMs / computeReport.summary.totalFrameTimeMs) * 100}%; background: #22c55e;">Render</div>
      </div>
      <p style="font-size:0.75rem; color:var(--text-muted); margin-top:8px;">
        Algorithmic Complexity: Projectile Collision $O(P \\times U)$ | Squad AI $O(U)$ | Checksum $O(S)$
      </p>
    </div>

    <!-- Pillar 3: Monte Carlo Squad Combat Playout -->
    <div class="card col-6">
      <div class="card-title">
        <span>Headless Monte Carlo Combat Simulator</span>
        <span>${monteCarlo.totalSimulations.toLocaleString()} BATTLES</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Squad Formation</th>
            <th>Combat Power</th>
            <th>Win Rate</th>
            <th>Duration</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${monteCarlo.squadResults.map(sq => `
            <tr>
              <td><strong>${sq.squadName}</strong><br><small style="color:var(--text-muted);">${sq.specialty}</small></td>
              <td>${sq.totalCombatPower}</td>
              <td style="color:${sq.winRateRaw >= 60 ? 'var(--green-phosphor)' : sq.winRateRaw >= 45 ? 'var(--cyan-telemetry)' : 'var(--amber-alert)'}; font-weight:bold;">${sq.winRate}</td>
              <td>${sq.avgDurationTicks} ticks</td>
              <td><span class="badge ${sq.balanceStatus === 'BALANCED' ? 'badge-low' : 'badge-med'}">${sq.balanceStatus}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Pillar 4: UI/UX Component Complexity Audit -->
    <div class="card col-6">
      <div class="card-title">
        <span>UI/UX View Hierarchy & Complexity</span>
        <span>${uiReport.summary.totalComponents} VIEWS</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Component View</th>
            <th>Lines</th>
            <th>Controls</th>
            <th>Hooks</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${uiReport.mostComplexComponents.map(comp => `
            <tr>
              <td><strong>${comp.name}</strong></td>
              <td>${comp.lineCount}</td>
              <td>${comp.interactiveElements}</td>
              <td>${comp.hooksCount}</td>
              <td><span class="badge ${comp.score >= 80 ? 'badge-low' : comp.score >= 60 ? 'badge-med' : 'badge-high'}">${comp.score}/100</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Optimization Matrix -->
    <div class="card col-12">
      <div class="card-title">
        <span>Tactical Optimization Action Matrix</span>
        <span>${matrix.totalIssues} PRIORITIZED ISSUES</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Subsystem</th>
            <th>Audit Finding & Required Action</th>
          </tr>
        </thead>
        <tbody>
          ${matrix.rankedIssues.map(issue => `
            <tr>
              <td><span class="badge ${issue.severity === 'CRITICAL' ? 'badge-critical' : issue.severity === 'HIGH' ? 'badge-high' : issue.severity === 'MEDIUM' ? 'badge-med' : 'badge-low'}">${issue.severity}</span></td>
              <td><strong>${issue.category}</strong></td>
              <td>${issue.message}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

  </main>
</body>
</html>`;
  }

  generateMarkdownDossier(data) {
    const { scorecard, designReport, uiReport, upgradesReport, computeReport, monteCarlo, matrix } = data;

    return `# WORLD WAR ROGUE // A.E.G.I.S. INTELLIGENCE AUDIT DOSSIER

**Classification:** CLASSIFIED // NATO UNCLASSIFIED EQUIVALENT // TOP SECRET MILITARY TACTICAL SPEC  
**Audit Timestamp:** ${new Date().toISOString()}  
**Inspector:** A.E.G.I.S. (Autonomous Engine & Game Intelligence System) v1.0.0  

---

## 1. Executive Summary & Health Index

| Composite Index | DEFCON Status | Game Design (30%) | UI/UX (25%) | Upgrades (25%) | Computing (20%) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **${scorecard.compositeScore}/100** | **${scorecard.defconStatus}** | ${scorecard.pillars.gameDesign.score}/100 | ${scorecard.pillars.uiUx.score}/100 | ${scorecard.pillars.upgrades.score}/100 | ${scorecard.pillars.computing.score}/100 |

---

## 2. Pillar 1: Game Design & Ballistics Balance

- **Units Evaluated:** ${designReport.summary.totalUnits} across ${designReport.summary.erasCount} tech eras and ${designReport.summary.factionCount} nations.
- **Combat Averages:** Effective HP: ${designReport.summary.avgEHP} | Sustained DPS: ${designReport.summary.avgDPS} | Power Rating: ${designReport.summary.avgPower}
- **Baseline TTK:** ${designReport.summary.baselineTTK} seconds

### Outlier Balance Units
- **Top Over-Tuned Candidate:** ${designReport.topOverpoweredCandidates?.[0]?.name || 'None'} (Efficiency: ${designReport.topOverpoweredCandidates?.[0]?.powerEfficiency || 'N/A'})
- **Top Under-Tuned Candidate:** ${designReport.topUnderpoweredCandidates?.[0]?.name || 'None'} (Efficiency: ${designReport.topUnderpoweredCandidates?.[0]?.powerEfficiency || 'N/A'})

---

## 3. Pillar 2: User Interface & Ergonomics Audit

- **Components Scanned:** ${uiReport.summary.totalComponents}
- **Average Lines of Code:** ${uiReport.summary.avgComponentLines} lines
- **Total Interactive Controls:** ${uiReport.summary.totalInteractiveElements}
- **HUD Theme Conformance:** ${uiReport.summary.themeConformityRate}
- **Oversized Components (>600 lines):** ${uiReport.summary.oversizedComponentsCount}

---

## 4. Pillar 3: Upgrades & Progression Scaling

- **Buildings Simulated:** ${upgradesReport.summary.analyzedBuildings}
- **Upgrade Tiers Evaluated:** ${upgradesReport.summary.upgradeTiersSimulated}
- **Average Upgrade ROI:** ${upgradesReport.summary.avgUpgradeROI}
- **Economic Traps Identified:** ${upgradesReport.summary.trapsDetected}
- **Runaway Upgrades Identified:** ${upgradesReport.summary.runawayUpgradesDetected}

---

## 5. Pillar 4: Computing & Frame Budget (60 FPS)

- **Target Frame Budget:** ${computeReport.summary.targetBudgetMs}ms (60 FPS)
- **Simulated Heavy Combat Frame Time:** ${computeReport.summary.totalFrameTimeMs}ms (~${computeReport.summary.estimatedFPS} FPS)
  - Physics / Ballistics Raycasting: ${computeReport.budgetBreakdown.physicsRaycastTimeMs}ms
  - Squad AI & Swarm Pathfinding: ${computeReport.budgetBreakdown.aiDecisionTimeMs}ms
  - State Checksum & Anti-Cheat: ${computeReport.budgetBreakdown.stateSyncTimeMs}ms
  - React DOM / Canvas Reconciliation: ${computeReport.budgetBreakdown.domRenderTimeMs}ms

---

## 6. Headless Monte Carlo Combat Simulation (${monteCarlo.totalSimulations.toLocaleString()} Battles)

| Squad Formation | Specialty | Combat Power | Win Rate | Avg Ticks | Balance Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
${monteCarlo.squadResults.map(sq => `| **${sq.squadName}** | ${sq.specialty} | ${sq.totalCombatPower} | **${sq.winRate}** | ${sq.avgDurationTicks} | \`${sq.balanceStatus}\` |`).join('\n')}

---

## 7. Actionable Tactical Optimization Matrix

| Severity | Category | Remediation Task |
| :--- | :--- | :--- |
${matrix.rankedIssues.map(i => `| **\`${i.severity}\`** | ${i.category} | ${i.message} |`).join('\n')}
`;
  }
}
