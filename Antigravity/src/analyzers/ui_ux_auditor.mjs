/**
 * Pillar 2: UI & UX Auditor
 * Audits React component complexity, cognitive load, information density, and HUD theme adherence.
 */
export class UIUXAuditor {
  constructor(config) {
    this.config = config;
    this.thresholds = config.uiThresholds;
  }

  /**
   * Audits component metrics collected from the codebase scanner.
   */
  audit(components = []) {
    if (!components || components.length === 0) {
      return { score: 50, issues: ['No React UI components found for audit.'], metrics: {} };
    }

    let score = 90;
    const issues = [];
    const componentScores = [];

    let totalInteractiveElements = 0;
    let oversizedComponentsCount = 0;
    let highHookDensityCount = 0;
    let themeAdherentCount = 0;

    for (const comp of components) {
      let compScore = 100;
      const compIssues = [];

      // Line Count & Maintainability Check
      if (comp.lineCount > this.thresholds.maxComponentLines) {
        oversizedComponentsCount++;
        compScore -= 20;
        compIssues.push(`Oversized component (${comp.lineCount} lines > ${this.thresholds.maxComponentLines} threshold). Consider decomposing into sub-components.`);
      }

      // Hook Density & State Churn Check
      if (comp.hooks.useState > this.thresholds.maxStateHooksPerComponent) {
        highHookDensityCount++;
        compScore -= 15;
        compIssues.push(`High state hook density (${comp.hooks.useState} useState hooks). Consider migrating local state to a centralized store or useReducer.`);
      }

      // Cognitive Load & Information Density Check
      totalInteractiveElements += comp.density.totalInteractive;
      if (comp.density.totalInteractive > this.thresholds.maxInteractiveElementsPerViewport) {
        compScore -= 15;
        compIssues.push(`High cognitive load: ${comp.density.totalInteractive} interactive elements in single component viewport.`);
      }

      // Military HUD Theme Conformance Check
      const hasThemeColors = (comp.theme.greenPhosphor + comp.theme.amberAlert + comp.theme.redDanger) > 0;
      if (hasThemeColors) {
        themeAdherentCount++;
      } else if (comp.lineCount > 150 && !comp.name.includes('Modal')) {
        compScore -= 10;
        compIssues.push('Low tactical HUD military theme token usage (phosphor green, amber alerts, dark slate).');
      }

      // Modal stacking check
      if (comp.density.modals > this.thresholds.maxModalStackDepth) {
        compScore -= 10;
        compIssues.push(`Potential modal stacking risk (${comp.density.modals} modal/dialog references).`);
      }

      componentScores.push({
        name: comp.name,
        lineCount: comp.lineCount,
        score: Math.max(0, compScore),
        interactiveElements: comp.density.totalInteractive,
        hooksCount: comp.hooks.totalHooks,
        themeConformant: hasThemeColors,
        issues: compIssues
      });
    }

    // System-wide scoring adjustments
    if (oversizedComponentsCount > 0) {
      issues.push({
        severity: 'MEDIUM',
        category: 'Component Architecture',
        message: `${oversizedComponentsCount} components exceed recommended line thresholds (>600 lines), increasing cognitive burden and maintenance risk.`
      });
      score -= Math.min(15, oversizedComponentsCount * 3);
    }

    if (highHookDensityCount > 0) {
      issues.push({
        severity: 'MEDIUM',
        category: 'State Management',
        message: `${highHookDensityCount} components exhibit high useState hook density (>7), increasing the likelihood of cascading re-renders.`
      });
      score -= Math.min(15, highHookDensityCount * 3);
    }

    const themeConformityRate = Math.round((themeAdherentCount / Math.max(1, components.length)) * 100);
    if (themeConformityRate < 70) {
      issues.push({
        severity: 'LOW',
        category: 'Visual & Thematic Consistency',
        message: `Only ${themeConformityRate}% of components utilize tactical military HUD color tokens.`
      });
      score -= 6;
    }

    // Sort components by complexity (most complex first)
    componentScores.sort((a, b) => b.lineCount - a.lineCount);

    return {
      score: Math.max(0, Math.min(100, score)),
      summary: {
        totalComponents: components.length,
        avgComponentLines: Math.round(components.reduce((acc, c) => acc + c.lineCount, 0) / components.length),
        totalInteractiveElements,
        themeConformityRate: `${themeConformityRate}%`,
        oversizedComponentsCount,
        highHookDensityCount
      },
      mostComplexComponents: componentScores.slice(0, 5),
      componentScores,
      issues
    };
  }
}
