const WINDOW = 5;
const VOLATILITY_HIGH = 30; // points range
const DELTA_DRIFT = -5;
const DELTA_REGRESS = -20;

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function classify(delta, trend, volatility, insufficient) {
  if (insufficient) return 'healthy';
  if (delta <= DELTA_REGRESS || trend === 'down' && delta < DELTA_DRIFT) return 'regressing';
  if (delta < DELTA_DRIFT || trend === 'down') return 'drifting';
  return 'healthy';
}

export function analyzeIntegrityDeviations(historyState = [], currentIntegrity = {}) {
  const capabilities = {};

  // For now we operate on a global capability based on overall integrity score.
  const scores = (historyState || [])
    .map((h) => (h.integrity && typeof h.integrity.score === 'number' ? h.integrity.score : null))
    .filter((s) => s !== null);

  const windowScores = scores.slice(-WINDOW);
  const insufficientHistory = windowScores.length < 2;
  const baseline = insufficientHistory ? (currentIntegrity.score ?? 0) : mean(windowScores);
  const current = currentIntegrity.score ?? 0;
  const delta = current - baseline;
  const percentDelta = baseline === 0 ? 0 : delta / baseline;
  const trend =
    windowScores.length >= 2
      ? windowScores[windowScores.length - 1] > windowScores[windowScores.length - 2]
        ? 'up'
        : windowScores[windowScores.length - 1] < windowScores[windowScores.length - 2]
          ? 'down'
          : 'flat'
      : 'flat';
  const volRange =
    windowScores.length > 1
      ? Math.max(...windowScores) - Math.min(...windowScores)
      : 0;
  const classification = classify(delta, trend, volRange, insufficientHistory);

  capabilities.global = {
    baseline,
    current,
    delta,
    percentDelta,
    trend,
    volatility: volRange,
    classification,
    insufficientHistory
  };

  const healthyCount = classification === 'healthy' ? 1 : 0;
  const driftingCount = classification === 'drifting' ? 1 : 0;
  const regressingCount = classification === 'regressing' ? 1 : 0;
  const highVolatilityCount = volRange > VOLATILITY_HIGH ? 1 : 0;

  return {
    capabilities,
    summary: {
      healthyCount,
      driftingCount,
      regressingCount,
      highVolatilityCount
    }
  };
}

export default { analyzeIntegrityDeviations };
