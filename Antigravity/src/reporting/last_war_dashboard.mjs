import fs from 'fs';
import path from 'path';

export class LastWarDashboardGenerator {
  constructor(config) {
    this.config = config;
    this.reportsDir = config.reportsDir;
  }

  async generateAll(payload) {
    if (!fs.existsSync(this.reportsDir)) {
      await fs.promises.mkdir(this.reportsDir, { recursive: true });
    }

    const htmlPath = path.join(this.reportsDir, 'last_war_dashboard.html');
    const mdPath = path.join(this.reportsDir, 'last_war_health_dossier.md');

    const htmlContent = this.generateHtml(payload);
    const mdContent = this.generateMarkdown(payload);

    await fs.promises.writeFile(htmlPath, htmlContent, 'utf8');
    await fs.promises.writeFile(mdPath, mdContent, 'utf8');

    return { htmlPath, mdPath };
  }

  generateHtml(payload) {
    const { scorecard, designReport, uiReport, upgradesReport, computeReport, tournament, matrix } = payload;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LAST WAR: SURVIVAL GAME // A.E.G.I.S. Intelligence Dashboard</title>
  <style>
    :root {
      --bg-base: #0b111e;
      --bg-card: #151d30;
      --border-hud: #24324f;
      --gold-vip: #f59e0b;
      --cyan-neon: #06b6d4;
      --green-tactical: #10b981;
      --red-alert: #ef4444;
      --tank-color: #3b82f6;
      --air-color: #ec4899;
      --missile-color: #f97316;
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-base);
      color: var(--text-main);
      padding: 24px;
      line-height: 1.5;
    }

    .header-bar {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid var(--border-hud);
      padding: 20px 24px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    }

    .title-box h1 {
      font-size: 1.5rem;
      letter-spacing: 1.5px;
      color: var(--gold-vip);
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .title-box p {
      color: var(--text-muted);
      font-size: 0.85rem;
      letter-spacing: 0.5px;
    }

    .defcon-badge {
      padding: 10px 18px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.9rem;
      border: 1px solid ${scorecard.statusColor};
      color: ${scorecard.statusColor};
      background: rgba(0,0,0,0.5);
      box-shadow: 0 0 15px ${scorecard.statusColor}33;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 20px;
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-hud);
      border-radius: 8px;
      padding: 20px;
    }

    .card-title {
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: var(--cyan-neon);
      margin-bottom: 16px;
      border-bottom: 1px solid var(--border-hud);
      padding-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .col-4 { grid-column: span 4; }
    .col-6 { grid-column: span 6; }
    .col-8 { grid-column: span 8; }
    .col-12 { grid-column: span 12; }

    /* Counter Triangle SVG */
    .triangle-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 10px;
    }

    /* Red Dot Saturation Gauge */
    .red-dot-gauge {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .red-dot-circle {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: var(--red-alert);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      font-weight: 800;
      color: #fff;
      box-shadow: 0 0 15px rgba(239, 68, 68, 0.6);
    }

    /* Stats Grid */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat-box {
      background: rgba(0,0,0,0.3);
      border: 1px solid var(--border-hud);
      padding: 12px;
      border-radius: 6px;
      text-align: center;
    }
    .stat-val {
      font-size: 1.3rem;
      font-weight: bold;
      color: var(--gold-vip);
    }
    .stat-lbl {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    th, td {
      padding: 9px 12px;
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
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 700;
    }
    .badge-tank { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid #3b82f6; }
    .badge-air { background: rgba(236, 72, 153, 0.2); color: #f472b6; border: 1px solid #ec4899; }
    .badge-missile { background: rgba(249, 115, 22, 0.2); color: #fb923c; border: 1px solid #f97316; }
    .badge-critical { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }
    .badge-high { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #f87171; }
    .badge-med { background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid #f59e0b; }

    @media (max-width: 900px) {
      .col-4, .col-6, .col-8 { grid-column: span 12; }
      .stats-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <!-- Top Header -->
  <header class="header-bar">
    <div class="title-box">
      <h1>⭐ LAST WAR: SURVIVAL GAME // INTELLIGENCE DOSSIER</h1>
      <p>Target: Commercial Live Service (FirstFun) // Model: 4X Strategy & Squad Auto-Battler // Timestamp: ${new Date().toISOString()}</p>
    </div>
    <div class="defcon-badge">
      ${scorecard.defconStatus} [${scorecard.compositeScore}/100]
    </div>
  </header>

  <!-- Grid -->
  <main class="dashboard-grid">

    <!-- Pillar 1: Counter Triangle Visualizer -->
    <div class="card col-4">
      <div class="card-title">
        <span>The Trinity Counter Triangle</span>
        <span style="color:var(--gold-vip);">+20% / -20%</span>
      </div>
      <div class="triangle-container">
        <svg width="280" height="260" viewBox="0 0 280 260">
          <!-- Outer Arrows -->
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4"/>
            </marker>
          </defs>
          <!-- Triangle Paths with arrows -->
          <!-- Tank (Top 140, 40) -> Missile (Bottom Right 230, 200) -->
          <line x1="140" y1="40" x2="215" y2="185" stroke="#3b82f6" stroke-width="3" marker-end="url(#arrow)" />
          <!-- Missile (Bottom Right 230, 200) -> Aircraft (Bottom Left 50, 200) -->
          <line x1="220" y1="210" x2="65" y2="210" stroke="#f97316" stroke-width="3" marker-end="url(#arrow)" />
          <!-- Aircraft (Bottom Left 50, 200) -> Tank (Top 140, 40) -->
          <line x1="50" y1="190" x2="125" y2="45" stroke="#ec4899" stroke-width="3" marker-end="url(#arrow)" />

          <!-- Nodes -->
          <!-- Tank Node -->
          <circle cx="140" cy="35" r="28" fill="#1e3a8a" stroke="#3b82f6" stroke-width="2"/>
          <text x="140" y="32" text-anchor="middle" fill="#fff" font-weight="bold" font-size="11">TANK</text>
          <text x="140" y="46" text-anchor="middle" fill="#93c5fd" font-size="8">BEATS MISSILE</text>

          <!-- Missile Node -->
          <circle cx="230" cy="205" r="28" fill="#7c2d12" stroke="#f97316" stroke-width="2"/>
          <text x="230" y="202" text-anchor="middle" fill="#fff" font-weight="bold" font-size="10">MISSILE</text>
          <text x="230" y="216" text-anchor="middle" fill="#fdba74" font-size="8">BEATS AIR</text>

          <!-- Aircraft Node -->
          <circle cx="50" cy="205" r="28" fill="#831843" stroke="#ec4899" stroke-width="2"/>
          <text x="50" y="202" text-anchor="middle" fill="#fff" font-weight="bold" font-size="10">AIRCRAFT</text>
          <text x="50" y="216" text-anchor="middle" fill="#f9a8d4" font-size="8">BEATS TANK</text>

          <!-- Center Monotype Synergy -->
          <circle cx="140" cy="150" r="24" fill="#0f172a" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3,3"/>
          <text x="140" y="147" text-anchor="middle" fill="#f59e0b" font-weight="bold" font-size="10">MONOTYPE</text>
          <text x="140" y="159" text-anchor="middle" fill="#94a3b8" font-size="8">+20% STATS</text>
        </svg>
      </div>
      <p style="font-size:0.75rem; color:var(--text-muted); text-align:center;">
        5-Hero Monotype bonus grants +20% HP/Attack/Def. Pair with type counter for devastating 40% swing.
      </p>
    </div>

    <!-- Pillar 2: Upgrades & The HQ 25-30 Gold Wall -->
    <div class="card col-8">
      <div class="card-title">
        <span>HQ Progression & The T10 "Unit X" Gold Wall</span>
        <span style="color:var(--gold-vip);">${upgradesReport.summary.goldRequiredForT10}</span>
      </div>
      <div class="stats-row">
        <div class="stat-box">
          <div class="stat-val">68,500</div>
          <div class="stat-lbl">Valor Badges (VS)</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">720 hrs</div>
          <div class="stat-lbl">HQ 30 Base Build Time</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">35% vs 15%</div>
          <div class="stat-lbl">Drone Drop Asymmetry</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>HQ Tier</th>
            <th>Build Time</th>
            <th>Gold Required</th>
            <th>Troop Tier</th>
            <th>Gatekeeper Requirement</th>
          </tr>
        </thead>
        <tbody>
          ${upgradesReport.progressionMilestones.slice(-4).map(h => `
            <tr>
              <td><strong>HQ Level ${h.level}</strong></td>
              <td>${h.constructionTimeHours} hours</td>
              <td style="color:var(--gold-vip); font-weight:bold;">${(h.goldCost / 1e6).toFixed(0)}M Gold</td>
              <td><span class="badge ${h.troopTierUnlocked.includes('T10') ? 'badge-critical' : 'badge-tank'}">${h.troopTierUnlocked}</span></td>
              <td>${h.requiredPrereq}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Pillar 3: UI/UX & Red-Dot Saturation Index -->
    <div class="card col-6">
      <div class="card-title">
        <span>UI / UX & Mobile Cognitive Load</span>
        <span style="color:var(--red-alert);">Red-Dot Index: ${uiReport.summary.redDotSaturationIndex}</span>
      </div>
      <div class="red-dot-gauge">
        <div class="red-dot-circle">${uiReport.summary.redDotSaturationIndex}</div>
        <div>
          <h4 style="color:#fff; font-size:0.95rem;">Active Red-Dot Badges on Login</h4>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-top:3px;">
            Simultaneous alerts across VIP, Radar, Drone, Mail, Alliance Duel, Arms Race, and Limited Packs trigger psychological FOMO fatigue.
          </p>
        </div>
      </div>
      <div class="stats-row" style="grid-template-columns: 1fr 1fr;">
        <div class="stat-box">
          <div class="stat-val">${uiReport.summary.dailyPopupsPerSession}</div>
          <div class="stat-lbl">Microtransaction Popups/Session</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${computeReport.summary.estimatedMobileFPS} FPS</div>
          <div class="stat-lbl">Mobile Frame Rate (Desert Storm)</div>
        </div>
      </div>
    </div>

    <!-- Pillar 4: Monte Carlo Tournament Results -->
    <div class="card col-6">
      <div class="card-title">
        <span>10,000-Battle Headless Tournament</span>
        <span>${tournament.totalTournamentRounds.toLocaleString()} MATCHES</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Matchup</th>
            <th>A Win %</th>
            <th>B Win %</th>
            <th>Counter Dynamics</th>
          </tr>
        </thead>
        <tbody>
          ${tournament.matchups.map(m => `
            <tr>
              <td><strong>${m.squadAType} vs ${m.squadBType}</strong></td>
              <td style="color:${m.aWinRateRaw >= 55 ? 'var(--green-tactical)' : 'var(--text-muted)'}; font-weight:bold;">${m.aWinRate}</td>
              <td style="color:${m.bWinRateRaw >= 55 ? 'var(--green-tactical)' : 'var(--text-muted)'}; font-weight:bold;">${m.bWinRate}</td>
              <td><span class="badge ${m.aWinRateRaw >= 60 || m.bWinRateRaw >= 60 ? 'badge-med' : 'badge-tank'}">${m.aWinRateRaw >= 60 ? `${m.squadAType} Advantage` : m.bWinRateRaw >= 60 ? `${m.squadBType} Advantage` : 'Contested'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Optimization Matrix -->
    <div class="card col-12">
      <div class="card-title">
        <span>Tactical Optimization Action Matrix for Last War</span>
        <span>${matrix.totalIssues} AUDITED ISSUES</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Dimension</th>
            <th>Architectural Assessment & Strategic Recommendation</th>
          </tr>
        </thead>
        <tbody>
          ${matrix.rankedIssues.map(issue => `
            <tr>
              <td><span class="badge ${issue.severity === 'HIGH' ? 'badge-critical' : issue.severity === 'MEDIUM' ? 'badge-med' : 'badge-tank'}">${issue.severity}</span></td>
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

  generateMarkdown(payload) {
    const { scorecard, designReport, uiReport, upgradesReport, computeReport, tournament, matrix } = payload;

    return `# LAST WAR: SURVIVAL GAME // MASTER INTELLIGENCE DOSSIER

**Classification:** CLASSIFIED // COMMERCIAL 4X AUDIT DOSSIER  
**Game Title:** Last War: Survival Game (FirstFun)  
**Platform:** Mobile (iOS / Android Portrait)  
**Inspector:** A.E.G.I.S. (Autonomous Engine & Game Intelligence System) v1.0.0  
**Timestamp:** ${new Date().toISOString()}  

---

## 1. Executive Health Scorecard

| Composite Score | DEFCON Readiness | Game Design | UI / UX | Upgrades & Economy | Mobile Computing |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **${scorecard.compositeScore}/100** | **${scorecard.defconStatus}** | ${scorecard.pillars.gameDesign.score}/100 | ${scorecard.pillars.uiUx.score}/100 | ${scorecard.pillars.upgrades.score}/100 | ${scorecard.pillars.computing.score}/100 |

---

## 2. Pillar 1: Game Design & The Trinity Counter System

- **Hero Pool Modeled:** ${designReport.summary.totalHeroes} heroes (${designReport.summary.urHeroes} UR, ${designReport.summary.ssrHeroes} SSR).
- **Unit Distribution:** ${designReport.summary.typeDistribution.tanks} Tanks, ${designReport.summary.typeDistribution.aircraft} Aircraft, ${designReport.summary.typeDistribution.missiles} Missiles.
- **Top Efficiency Hero:** ${designReport.summary.topEfficiencyHero}
- **Trinity Counter Mechanics:**
  - **Tanks** beat **Missiles** (+20% damage dealt, -20% incoming damage)
  - **Missiles** beat **Aircraft** (+20% damage dealt, -20% incoming damage)
  - **Aircraft** beat **Tanks** (+20% damage dealt, -20% incoming damage)
- **Monotype Squad Multiplier:** 5 heroes of same type grant a massive **+20% HP, Attack, and Defense** bonus.

---

## 3. Pillar 2: UI / UX Architecture & Mobile Cognitive Load

- **The Red-Dot Saturation Index:** **${uiReport.summary.redDotSaturationIndex} simultaneous active notification dots** across primary interfaces upon login.
- **Microtransaction Popup Frequency:** **${uiReport.summary.dailyPopupsPerSession} popups per login session**.
- **Ergonomics Profile:** Modern 19.5:9 portrait smartphone aspect ratio places VIP and stamina counters out of the natural single-handed thumb zone.

---

## 4. Pillar 3: Upgrades & The T10 "Unit X" Progression Wall

- **Gold Coin Bottleneck:** Reaching T10 troops via the Special Forces research tree requires **${upgradesReport.summary.goldRequiredForT10}**, creating a severe economic cliff starting at HQ 25.
- **Valor Badge Gating:** **${upgradesReport.summary.valorBadgesRequired} Valor Badges** strictly gates progression behind weekly Alliance Duel (VS) performance.
- **Drone Component Asymmetry:** Right-side components (Missile, Fuel Cell, Thermal Imager) drop at only **15% weight** compared to **35% weight** for left-side components.

---

## 5. Pillar 4: Mobile Computing & Thermal Profiling

- **Simulated Frame Budget:** ${computeReport.summary.simulatedMobileFrameTimeMs}ms under heavy 100-player Desert Storm rally load.
- **Estimated Mobile FPS:** ~${computeReport.summary.estimatedMobileFPS} FPS.
- **Thermal Throttling Risk:** ${computeReport.summary.thermalRiskLevel}.
- **Server Netcode:** 100-player concurrent rally synchronization can experience 120-250ms packet spikes during Capitol War.

---

## 6. Headless Monte Carlo Tournament (${tournament.totalTournamentRounds.toLocaleString()} Battles)

| Matchup | Squad A Win % | Squad B Win % | Counter Dynamic |
| :--- | :---: | :---: | :--- |
${tournament.matchups.map(m => `| **${m.squadAName}** vs **${m.squadBName}** | **${m.aWinRate}** | **${m.bWinRate}** | ${m.aWinRateRaw >= 60 ? `${m.squadAType} Counter Advantage` : m.bWinRateRaw >= 60 ? `${m.squadBType} Counter Advantage` : 'Competitive'} |`).join('\n')}

---

## 7. Actionable Tactical Optimization Matrix

| Severity | Category | Strategic Finding & Recommendation |
| :--- | :--- | :--- |
${matrix.rankedIssues.map(i => `| **\`${i.severity}\`** | ${i.category} | ${i.message} |`).join('\n')}
`;
  }
}
