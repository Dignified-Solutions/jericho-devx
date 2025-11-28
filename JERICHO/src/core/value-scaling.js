const MAX_DELTA_W = 0.1;

export function updateCapabilityWeights(identityRequirements = [], history = []) {
  const statsMap = buildStats(history);

  const adjusted = (identityRequirements || []).map((req) => {
    const key = makeKey(req.domain, req.capability);
    const stats = statsMap.get(key) || {
      cyclesTouched: 0,
      totalDelta: 0,
      avgDelta: 0,
      avgIntegrity: 0
    };

    const w0 = req.weight ?? 0;
    let deltaW = 0;

    const progressPositive = stats.avgDelta > 0.2;
    const stagnant = Math.abs(stats.avgDelta) <= 0.1;
    const highIntegrity = stats.avgIntegrity >= 70;
    const lowIntegrity = stats.avgIntegrity > 0 && stats.avgIntegrity < 40;
    const untouched = stats.cyclesTouched === 0;

    if (progressPositive && highIntegrity) deltaW += 0.05;
    if (stagnant && highIntegrity) deltaW += 0.03;
    if (stagnant && lowIntegrity) deltaW += 0;
    if (stats.avgDelta < -0.1) deltaW += 0.04;
    if (untouched) deltaW -= 0.03;

    deltaW = clamp(deltaW, -MAX_DELTA_W, MAX_DELTA_W);
    let newWeight = w0 + deltaW;
    newWeight = clamp(newWeight, 0.05, 1);

    return { ...req, weight: newWeight };
  });

  const sumW = adjusted.reduce((acc, r) => acc + r.weight, 0);
  if (sumW <= 0) {
    return identityRequirements.map((req) => ({ ...req }));
  }

  return adjusted.map((req) => ({
    ...req,
    weight: req.weight / sumW
  }));
}

function buildStats(history) {
  const map = new Map();
  const pushStats = (domain, capability, delta, integrityScore) => {
    const k = makeKey(domain, capability);
    const current = map.get(k) || {
      cyclesTouched: 0,
      totalDelta: 0,
      avgDelta: 0,
      avgIntegrity: 0
    };
    const cyclesTouched = current.cyclesTouched + 1;
    const totalDelta = current.totalDelta + delta;
    const avgDelta = totalDelta / cyclesTouched;
    const avgIntegrity =
      (current.avgIntegrity * current.cyclesTouched + integrityScore) / cyclesTouched;
    map.set(k, { cyclesTouched, totalDelta, avgDelta, avgIntegrity });
  };

  for (const entry of history || []) {
    const integrityScore = entry?.integrity?.score ?? 0;
    for (const change of entry?.changes || []) {
      const delta = change.delta ?? 0;
      pushStats(change.domain, change.capability, delta, integrityScore);
    }
  }
  return map;
}

function makeKey(domain, capability) {
  return `${domain || ''}:${capability || ''}`.toLowerCase();
}

function clamp(val, min, max) {
  const num = Number(val);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}
