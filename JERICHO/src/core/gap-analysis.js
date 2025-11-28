/**
 * Calculate gaps between current and target identity capabilities.
 * Returns sorted gaps with most severe first.
 */
export function calculateGap(requirements) {
  const gaps = (requirements || []).map((req) => {
    const gap = Math.max(req.targetLevel - (req.currentLevel ?? 0), 0);
    return {
      domain: req.domain,
      capability: req.capability,
      targetLevel: req.targetLevel,
      currentLevel: req.currentLevel ?? 0,
      gap,
      rationale: req.rationale
    };
  });

  return gaps.sort((a, b) => b.gap - a.gap || b.targetLevel - a.targetLevel);
}
