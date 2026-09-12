/**
 * Actionable Recommendation Matrix
 * Synthesizes and prioritizes issues across all game dimensions into an operational task plan.
 */
export class RecommendationMatrix {
  /**
   * Compiles and ranks issues by severity.
   */
  compile(allIssues = []) {
    const flatIssues = allIssues.flat();

    const priorityWeights = {
      'CRITICAL': 4,
      'HIGH': 3,
      'MEDIUM': 2,
      'LOW': 1
    };

    const sorted = [...flatIssues].sort((a, b) => {
      const wA = priorityWeights[a.severity] || 0;
      const wB = priorityWeights[b.severity] || 0;
      return wB - wA;
    });

    const categorized = {
      critical: sorted.filter(i => i.severity === 'CRITICAL'),
      high: sorted.filter(i => i.severity === 'HIGH'),
      medium: sorted.filter(i => i.severity === 'MEDIUM'),
      low: sorted.filter(i => i.severity === 'LOW')
    };

    return {
      totalIssues: sorted.length,
      counts: {
        critical: categorized.critical.length,
        high: categorized.high.length,
        medium: categorized.medium.length,
        low: categorized.low.length
      },
      rankedIssues: sorted,
      categorized
    };
  }
}
