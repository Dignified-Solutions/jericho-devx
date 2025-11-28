const MAX_STEP = 2;

export function applyIdentityUpdate(identityState = [], rankedGaps = [], integritySummary, tasks = []) {
  const integrityFactor =
    integritySummary && integritySummary.maxPossible > 0 ? (integritySummary.score || 0) / 100 : 0;

  const gapMap = new Map(
    (rankedGaps || []).map((gap) => [key(gap.domain, gap.capability), gap])
  );

  const activityMap = new Map();
  for (const task of tasks || []) {
    const k = key(task.domain, task.capability);
    const impact = Number(task.estimatedImpact) || 0;
    activityMap.set(k, (activityMap.get(k) || 0) + impact);
  }

  const impactedKeys = Array.from(activityMap.keys());
  const maxImpact =
    impactedKeys.length > 0 ? Math.max(...impactedKeys.map((k) => activityMap.get(k))) : 0;

  const updatedIdentity = [];
  const changes = [];

  for (const entry of identityState || []) {
    const k = key(entry.domain, entry.capability);
    const totalImpact = activityMap.get(k) || 0;
    const gap = gapMap.get(k);

    if (!gap || totalImpact <= 0 || (gap.rawGap ?? 0) <= 0) {
      updatedIdentity.push({ ...entry });
      continue;
    }

    const activityFactor = maxImpact > 0 ? totalImpact / maxImpact : 0;
    const combinedFactor = integrityFactor * activityFactor;
    const desiredStep = Math.min(gap.rawGap, MAX_STEP) * combinedFactor;
    const step = Math.round(desiredStep * 10) / 10;

    if (step <= 0) {
      updatedIdentity.push({ ...entry });
      continue;
    }

    let newLevel = (entry.level || 0) + step;
    newLevel = Math.min(newLevel, gap.targetLevel);
    newLevel = clamp(newLevel, 1, 10);

    const updatedEntry = { ...entry, level: newLevel };
    updatedIdentity.push(updatedEntry);
    changes.push({
      id: entry.id,
      domain: entry.domain,
      capability: entry.capability,
      beforeLevel: entry.level,
      afterLevel: newLevel,
      delta: newLevel - entry.level
    });
  }

  return { updatedIdentity, changes };
}

function key(domain, capability) {
  return `${domain || ''}:${capability || ''}`.toLowerCase();
}

function clamp(val, min, max) {
  const num = Number(val);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}
