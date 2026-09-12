import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Default target game project (WORLD WAR ROGUE in parent directory)
const defaultGamePath = path.resolve(rootDir, '..', 'WORLD WAR ROGUE');

export const CONFIG = {
  agentName: 'A.E.G.I.S.',
  agentFullName: 'Autonomous Engine & Game Intelligence System',
  version: '1.0.0',
  rootDir,
  targetGamePath: process.env.GAME_PROJECT_PATH || defaultGamePath,
  reportsDir: path.join(rootDir, 'reports'),
  
  // Weights for the composite Game Health Scorecard (sums to 1.0)
  pillarWeights: {
    gameDesign: 0.30,
    uiUx: 0.25,
    upgrades: 0.25,
    computing: 0.20
  },

  // Game Design Evaluation Thresholds
  designThresholds: {
    minTTKSeconds: 3.0,          // Time-to-kill under 3s is twitch/instakill risk
    maxTTKSeconds: 25.0,         // Time-to-kill over 25s leads to bullet-sponge stalemate
    optimalTTKSeconds: 8.5,
    maxPowerVarianceRatio: 2.2,  // Units in same era shouldn't vary in raw efficiency by > 2.2x
    minRockPaperScissorsSpread: 0.25 // Counter advantages should provide at least 25% differential
  },

  // UI/UX Audit Thresholds
  uiThresholds: {
    maxComponentLines: 600,       // Components > 600 lines flag maintainability & cognitive risk
    maxStateHooksPerComponent: 7, // Components with > 7 useState/useReducer flag state churn
    maxModalStackDepth: 2,        // Deep modal nesting causes mobile & UX disorientation
    maxInteractiveElementsPerViewport: 28, // High density creates cognitive overload
    targetThemePhosphorColors: ['#22c55e', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#eab308']
  },

  // Upgrades & Progression Thresholds
  upgradeThresholds: {
    minROI: 0.05,                 // Upgrades delivering < 5% power gain per 100 resources are "dead-ends"
    maxROI: 0.85,                 // Upgrades delivering > 85% gain are "must-picks" / runaway power creep
    maxEraPowerJumpRatio: 2.0,    // Tech era transition shouldn't invalidate previous era by > 2x immediately
    maxBuildingLevel: 10
  },

  // Computing & Performance Profiler Budgets (Target: 60 FPS = 16.66ms per frame)
  frameBudgetMs: {
    totalBudget: 16.66,
    physicsAndBallistics: 3.2,
    squadAiAndSwarm: 4.0,
    stateSyncAndReconciliation: 1.8,
    reactRenderAndDom: 7.66
  },

  // Headless Simulation Configurations
  simulation: {
    monteCarloDefaultRounds: 10000,
    economySimDays: 100,
    crisisSwarmIntervalDays: 7
  }
};
