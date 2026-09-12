/**
 * Pillar 4: Computing & Performance Profiler
 * Analyzes frame tick budgets (16.6ms), algorithmic complexity, React render churn, and memory risks.
 */
export class ComputingProfiler {
  constructor(config) {
    this.config = config;
    this.budgets = config.frameBudgetMs;
  }

  /**
   * Profiles components and game systems for computing bottlenecks.
   */
  profile(components = [], unitsCount = 100) {
    let score = 91;
    const issues = [];

    // Analyze React Render Churn & Memory Leaks in Components
    let totalUnmemoizedArrayOps = 0;
    let totalInlineHandlers = 0;
    let totalUncleanedIntervals = 0;
    let highRiskComponents = [];

    for (const comp of components) {
      const p = comp.performanceRisks;
      totalUnmemoizedArrayOps += p.unmemoizedArrayOps;
      totalInlineHandlers += p.inlineHandlers;
      if (p.intervals > 0 && comp.hooks.useEffect === 0) {
        totalUncleanedIntervals++;
      }

      const riskScore = (p.unmemoizedArrayOps * 2) + (p.inlineHandlers * 1) + (p.intervals * 5);
      if (riskScore > 25 || p.unmemoizedArrayOps > 10) {
        highRiskComponents.push({
          name: comp.name,
          riskScore,
          unmemoizedArrayOps: p.unmemoizedArrayOps,
          inlineHandlers: p.inlineHandlers,
          intervals: p.intervals
        });
      }
    }

    if (totalUnmemoizedArrayOps > 20) {
      issues.push({
        severity: 'MEDIUM',
        category: 'Render Performance',
        message: `${totalUnmemoizedArrayOps} unmemoized array transformations (.filter, .map, .sort) detected across render methods, risking garbage collection spikes and UI stutter.`
      });
      score -= Math.min(12, Math.round(totalUnmemoizedArrayOps / 5));
    }

    if (totalInlineHandlers > 30) {
      issues.push({
        severity: 'LOW',
        category: 'Render Optimization',
        message: `${totalInlineHandlers} inline arrow functions inside JSX props force child re-renders on every parent tick. Memoize with useCallback.`
      });
      score -= 5;
    }

    // 16.6ms Frame Budget Simulation for 100 Active Units + Projectiles
    const activeProjectilesEstimate = 150;
    const activeUnits = unitsCount;

    // Estimated algorithmic complexity execution times (ms on standard client hardware)
    // O(N*M) projectile-vs-unit collision checks
    const physicsRaycastTimeMs = Math.round(((activeProjectilesEstimate * activeUnits * 0.00018) + 1.2) * 100) / 100;
    // O(N) AI decision tick
    const aiDecisionTimeMs = Math.round(((activeUnits * 0.025) + 0.8) * 100) / 100;
    // State checksum & serialization
    const stateSyncTimeMs = Math.round(1.15 * 100) / 100;
    // DOM & Canvas render time
    const domRenderTimeMs = Math.round((Math.min(7.0, (components.length * 0.35) + 2.5)) * 100) / 100;

    const totalFrameTimeMs = Math.round((physicsRaycastTimeMs + aiDecisionTimeMs + stateSyncTimeMs + domRenderTimeMs) * 100) / 100;
    const targetBudgetMs = this.budgets.totalBudget; // 16.66ms
    const estimatedFPS = Math.min(60, Math.round(1000 / totalFrameTimeMs));

    if (totalFrameTimeMs > targetBudgetMs) {
      issues.push({
        severity: 'HIGH',
        category: 'Frame Budget Deficit',
        message: `Simulated frame execution time (${totalFrameTimeMs}ms) exceeds the 16.66ms budget (60 FPS), yielding estimated ~${estimatedFPS} FPS during heavy combat.`
      });
      score -= 15;
    }

    // Algorithmic Complexity Evaluation
    const complexityChecks = [
      {
        subsystem: 'Combat Ballistics & Hitscan',
        complexity: 'O(P * U) - Projectiles x Units',
        status: physicsRaycastTimeMs > this.budgets.physicsAndBallistics ? 'WARNING' : 'OPTIMAL',
        timeMs: physicsRaycastTimeMs,
        budgetMs: this.budgets.physicsAndBallistics,
        recommendation: 'Implement spatial hashing grid or BVH quadtree for broadphase collision culling.'
      },
      {
        subsystem: 'Squad AI & Swarm Flocking',
        complexity: 'O(U) - Linear Unit Loop',
        status: aiDecisionTimeMs > this.budgets.squadAiAndSwarm ? 'WARNING' : 'OPTIMAL',
        timeMs: aiDecisionTimeMs,
        budgetMs: this.budgets.squadAiAndSwarm,
        recommendation: 'Stagger AI decision updates across alternating ticks (time-slicing).'
      },
      {
        subsystem: 'State Checksum & Anti-Cheat',
        complexity: 'O(S) - State Delta Serialization',
        status: stateSyncTimeMs > this.budgets.stateSyncAndReconciliation ? 'WARNING' : 'OPTIMAL',
        timeMs: stateSyncTimeMs,
        budgetMs: this.budgets.stateSyncAndReconciliation,
        recommendation: 'Compress telemetry payloads using binary ArrayBuffers or protobuf.'
      },
      {
        subsystem: 'React View & HUD Re-render',
        complexity: 'O(C) - Component Tree Reconciliation',
        status: domRenderTimeMs > this.budgets.reactRenderAndDom ? 'WARNING' : 'OPTIMAL',
        timeMs: domRenderTimeMs,
        budgetMs: this.budgets.reactRenderAndDom,
        recommendation: 'Memoize heavy sub-trees with React.memo and isolate fast-updating timer HUDs.'
      }
    ];

    return {
      score: Math.max(0, Math.min(100, score)),
      summary: {
        totalFrameTimeMs,
        targetBudgetMs,
        estimatedFPS,
        totalUnmemoizedArrayOps,
        totalInlineHandlers,
        highRiskComponentsCount: highRiskComponents.length
      },
      budgetBreakdown: {
        physicsRaycastTimeMs,
        aiDecisionTimeMs,
        stateSyncTimeMs,
        domRenderTimeMs,
        budgetAllocations: this.budgets
      },
      complexityChecks,
      highRiskComponents: highRiskComponents.slice(0, 5),
      issues
    };
  }
}
