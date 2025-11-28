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

export function computeCapabilityGaps(identityState = [], requirements = []) {
  const stateIndex = new Map(
    (identityState || []).map((entry) => [
      key(entry.domain, entry.capability),
      { ...entry, level: clamp(entry.level, 1, 10) }
    ])
  );

  return (requirements || []).map((req) => {
    const currentEntry = stateIndex.get(key(req.domain, req.capability));
    const currentLevel = currentEntry ? currentEntry.level : 3;
    const rawGap = Math.max((req.targetLevel || 0) - currentLevel, 0);
    const weight = clamp(req.weight ?? 0, 0, 1);
    const weightedGap = rawGap * weight;
    return {
      requirementId: req.id,
      domain: req.domain,
      capability: req.capability,
      targetLevel: req.targetLevel,
      currentLevel,
      weight,
      rawGap,
      weightedGap
    };
  });
}

export function rankCapabilityGaps(gaps = []) {
  const ranked = [...(gaps || [])].sort((a, b) => {
    if (b.weightedGap !== a.weightedGap) return b.weightedGap - a.weightedGap;
    return String(a.capability).localeCompare(String(b.capability));
  });
  return ranked.map((gap, idx) => ({ ...gap, rank: idx + 1 }));
}

function key(domain, capability) {
  return `${domain || ''}:${capability || ''}`.toLowerCase();
}

function clamp(val, min, max) {
  const num = Number(val);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}
