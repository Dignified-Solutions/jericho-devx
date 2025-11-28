const DEFAULT_CYCLE_DAYS = 7;
const WINDOW_SIZE = 3;

export function computeForecast(goal, identityRequirements = [], history = []) {
  const window = history.slice(-WINDOW_SIZE);

  const { cycleDays, lastTimestampIso } = deriveCycleTiming(window);

  const capStats = buildCapabilityStats(window);

  const identityTrajectories = identityRequirements.map((req) => {
    const key = makeKey(req.domain, req.capability);
    const stats = capStats.get(key) || { deltas: [], lastLevel: null };
    const avgDeltaPerCycle = average(stats.deltas);
    const latestLevel = resolveLatestLevel(stats.lastLevel, req.targetLevel);
    const gap = req.targetLevel - latestLevel;

    let projectedCyclesToTarget = null;
    let projectedDateToTarget = null;

    if (gap <= 0) {
      projectedCyclesToTarget = 0;
      projectedDateToTarget = null;
    } else if (stats.deltas.length >= 2 && avgDeltaPerCycle > 0) {
      projectedCyclesToTarget = Math.ceil(gap / avgDeltaPerCycle);
      if (lastTimestampIso) {
        const projectedDays = projectedCyclesToTarget * cycleDays;
        const dt = new Date(lastTimestampIso);
        dt.setDate(dt.getDate() + projectedDays);
        projectedDateToTarget = dt.toISOString();
      }
    }

    return {
      domain: req.domain,
      capability: req.capability,
      targetLevel: req.targetLevel,
      latestLevel,
      avgDeltaPerCycle,
      projectedCyclesToTarget,
      projectedDateToTarget
    };
  });

  const goalForecast = computeGoalForecast(identityTrajectories, identityRequirements, lastTimestampIso, cycleDays, goal);
  const volatility = computeVolatility(window);
  const sustainability = computeSustainability(window);

  return {
    identityTrajectories,
    goalForecast,
    volatility,
    sustainability
  };
}

function deriveCycleTiming(window) {
  if (window.length === 0) {
    return { cycleDays: DEFAULT_CYCLE_DAYS, lastTimestampIso: null };
  }
  const timestamps = window.map((h) => new Date(h.timestamp));
  const lastTimestampIso = timestamps[timestamps.length - 1].toISOString();
  if (timestamps.length === 1) {
    return { cycleDays: DEFAULT_CYCLE_DAYS, lastTimestampIso };
  }
  const diffs = [];
  for (let i = 1; i < timestamps.length; i++) {
    const diffMs = timestamps[i] - timestamps[i - 1];
    diffs.push(diffMs / (1000 * 60 * 60 * 24));
  }
  const cycleDays = average(diffs) || DEFAULT_CYCLE_DAYS;
  return { cycleDays, lastTimestampIso };
}

function buildCapabilityStats(window) {
  const map = new Map();

  for (const entry of window) {
    for (const change of entry?.changes || []) {
      const k = makeKey(change.domain, change.capability);
      const current = map.get(k) || { deltas: [], lastLevel: null };
      current.deltas = [...current.deltas, change.delta ?? 0];
      current.lastLevel = change.afterLevel ?? current.lastLevel;
      map.set(k, current);
    }
    // update lastLevel from identityAfter if missing
    for (const identity of entry?.identityAfter || []) {
      const k = makeKey(identity.domain, identity.capability);
      const current = map.get(k) || { deltas: [], lastLevel: null };
      current.lastLevel = identity.level ?? current.lastLevel;
      map.set(k, current);
    }
  }

  return map;
}

function resolveLatestLevel(lastLevel, targetLevel) {
  if (typeof lastLevel === 'number') return lastLevel;
  if (typeof targetLevel === 'number') return targetLevel - 1;
  return 5;
}

function computeGoalForecast(identityTrajectories, identityRequirements, lastTimestampIso, cycleDays, goal) {
  const feasible = identityTrajectories.filter((t) => t.projectedCyclesToTarget !== null);
  const totalWeight = feasible.reduce((acc, t, idx) => acc + (identityRequirements[idx]?.weight || 0), 0);

  let cyclesToTargetOnAverage = null;
  let projectedDate = null;

  if (totalWeight > 0) {
    const weightedCycles = feasible.reduce(
      (acc, t, idx) => acc + (identityRequirements[idx]?.weight || 0) * (t.projectedCyclesToTarget || 0),
      0
    );
    cyclesToTargetOnAverage = weightedCycles / totalWeight;
    if (lastTimestampIso) {
      const projectedDays = cyclesToTargetOnAverage * cycleDays;
      const dt = new Date(lastTimestampIso);
      dt.setDate(dt.getDate() + projectedDays);
      projectedDate = dt.toISOString();
    }
  }

  let onTrack = null;
  if (goal?.deadline) {
    if (projectedDate) {
      onTrack = new Date(projectedDate) <= new Date(goal.deadline);
    }
  }

  return {
    projectedDate,
    cyclesToTargetOnAverage,
    onTrack
  };
}

function computeVolatility(window) {
  const integrityScores = window.map((e) => e.integrity?.score ?? 0);
  const deltas = window.flatMap((e) => (e?.changes || []).map((c) => c.delta ?? 0));

  const integrityStdDev = stddev(integrityScores);
  const identityDeltaStdDev = stddev(deltas);

  return { integrityStdDev, identityDeltaStdDev };
}

function computeSustainability(window) {
  const integrityScores = window.map((e) => e.integrity?.score ?? 0);
  const avgIntegrity = average(integrityScores);

  const perCycleDeltaMagnitudes = window.map((e) => {
    const deltas = (e?.changes || []).map((c) => Math.abs(c.delta ?? 0));
    return deltas.length ? average(deltas) : 0;
  });
  const avgDeltaMagnitudePerCycle = average(perCycleDeltaMagnitudes);

  return { avgIntegrity, avgDeltaMagnitudePerCycle };
}

function average(arr) {
  if (!arr.length) return 0;
  const sum = arr.reduce((acc, n) => acc + (Number(n) || 0), 0);
  return sum / arr.length;
}

function stddev(arr) {
  if (!arr || arr.length < 2) return 0;
  const mean = average(arr);
  const variance = average(arr.map((v) => (v - mean) ** 2));
  return Math.sqrt(variance);
}

function makeKey(domain, capability) {
  return `${domain || ''}:${capability || ''}`.toLowerCase();
}
