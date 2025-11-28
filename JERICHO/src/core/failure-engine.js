const HIGH_MISS_THRESHOLD = 0.4;
const HIGH_LATE_THRESHOLD = 0.4;
const LOW_INTEGRITY_THRESHOLD = 40;
const WINDOW_SIZE = 3;

export function analyzeFailurePatterns(history = [], currentIntegrity) {
  const window = buildWindow(history, currentIntegrity);
  const recentCycles = window.length;

  const avgIntegrity = average(window.map((c) => c.integrity.score || 0));
  const avgCompletionRate = average(window.map((c) => c.integrity.breakdown.completionRate || 0));
  const avgOnTimeRate = average(window.map((c) => c.integrity.breakdown.onTimeRate || 0));

  const trend = computeTrend(window);

  const missRate = avgCompletionRate > 0 ? 1 - avgCompletionRate : 0;
  const lateRate = window.length
    ? average(
        window.map((c) => {
          const br = c.integrity.breakdown;
          const completed = (br.completedOnTime || 0) + (br.completedLate || 0);
          return completed > 0 ? (br.completedLate || 0) / completed : 0;
        })
      )
    : 0;

  const highMissRate = missRate > HIGH_MISS_THRESHOLD;
  const highLateRate = lateRate > HIGH_LATE_THRESHOLD;
  const chronicLowIntegrity = avgIntegrity < LOW_INTEGRITY_THRESHOLD;
  const avoidanceSuspected = highMissRate && chronicLowIntegrity;

  const { throughputAdjustment, throughputFactor, enforceCatchUpCycle, suggestCapabilityFocus } =
    computeThroughput(avgCompletionRate, trend, highMissRate, chronicLowIntegrity);

  const flaggedCapabilities = flagCapabilities(window, highMissRate);

  return {
    summary: {
      recentCycles,
      avgIntegrity,
      avgCompletionRate,
      avgOnTimeRate,
      trend
    },
    failureProfile: {
      highMissRate,
      highLateRate,
      chronicLowIntegrity,
      avoidanceSuspected
    },
    recommendations: {
      throughputAdjustment,
      throughputFactor,
      enforceCatchUpCycle,
      suggestCapabilityFocus,
      flaggedCapabilities
    }
  };
}

function buildWindow(history, currentIntegrity) {
  const entries = Array.isArray(history) ? [...history] : [];
  if (entries.length === 0 && currentIntegrity) {
    entries.push({
      integrity: currentIntegrity,
      changes: []
    });
  }
  return entries.slice(-WINDOW_SIZE);
}

function computeTrend(window) {
  if (window.length < 2) return 'unknown';
  const first = window[0]?.integrity?.score || 0;
  const last = window[window.length - 1]?.integrity?.score || 0;
  if (last - first > 10) return 'improving';
  if (first - last > 10) return 'declining';
  return 'stable';
}

function computeThroughput(avgCompletionRate, trend, highMissRate, chronicLowIntegrity) {
  let throughputFactor = 1.0;
  let throughputAdjustment = 'hold';
  let enforceCatchUpCycle = false;

  if (chronicLowIntegrity && highMissRate) {
    throughputAdjustment = 'decrease';
    throughputFactor = 0.5;
    enforceCatchUpCycle = true;
  } else if (trend === 'declining' && avgCompletionRate < 0.6) {
    throughputAdjustment = 'decrease';
    throughputFactor = 0.7;
  } else if (trend === 'improving' && avgCompletionRate > 0.8) {
    throughputAdjustment = 'increase';
    throughputFactor = 1.2;
  }

  throughputFactor = clamp(throughputFactor, 0.4, 1.5);
  const suggestCapabilityFocus = throughputAdjustment === 'decrease';

  return { throughputAdjustment, throughputFactor, enforceCatchUpCycle, suggestCapabilityFocus };
}

function flagCapabilities(window, highMissRate) {
  const map = new Map();
  for (const entry of window) {
    for (const change of entry?.changes || []) {
      const k = key(change.domain, change.capability);
      const current = map.get(k) || { negativeCount: 0, stagnantCount: 0 };
      const delta = change.delta ?? 0;
      const negativeCount = current.negativeCount + (delta < -0.2 ? 1 : 0);
      const stagnantCount = current.stagnantCount + (Math.abs(delta) <= 0.1 ? 1 : 0);
      map.set(k, { negativeCount, stagnantCount, domain: change.domain, capability: change.capability });
    }
  }

  const flagged = [];
  for (const entry of map.values()) {
    if (entry.negativeCount >= 2) {
      flagged.push({ domain: entry.domain, capability: entry.capability, reason: 'regression' });
    } else if (entry.stagnantCount >= 2 && highMissRate) {
      flagged.push({ domain: entry.domain, capability: entry.capability, reason: 'chronic_miss' });
    }
  }
  return flagged;
}

function average(arr) {
  if (!arr.length) return 0;
  const sum = arr.reduce((acc, n) => acc + (Number(n) || 0), 0);
  return sum / arr.length;
}

function key(domain, capability) {
  return `${domain || ''}:${capability || ''}`.toLowerCase();
}

function clamp(val, min, max) {
  const num = Number(val);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}
