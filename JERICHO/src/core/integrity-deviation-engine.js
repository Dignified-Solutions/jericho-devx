const WINDOW = 5;
const VOLATILITY_HIGH = 30;
const DELTA_DRIFT = -5;
const DELTA_REGRESS = -20;
const TEAM_DEVIATION_MAP = {
  critical: 'collapsing',
  overloaded: 'regressing',
  stable: 'healthy',
  underloaded: 'healthy'
};

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function classify(delta, trend, volatility, insufficient) {
  if (insufficient) return 'healthy';
  if (delta <= DELTA_REGRESS || (trend === 'down' && delta < DELTA_DRIFT)) return 'regressing';
  if (delta < DELTA_DRIFT || trend === 'down') return 'drifting';
  return 'healthy';
}

export function analyzeIntegrityDeviations(historyState = [], currentIntegrity = {}, teamGovernance = null) {
  const capabilities = {};
  const scores = (historyState || [])
    .map((h) => (h.integrity && typeof h.integrity.score === 'number' ? h.integrity.score : null))
    .filter((s) => s !== null);

  const windowScores = scores.slice(-WINDOW);
  const insufficientHistory = windowScores.length < 2;
  const baseline = insufficientHistory ? currentIntegrity.score ?? 0 : mean(windowScores);
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
  const volatility = windowScores.length > 1 ? Math.max(...windowScores) - Math.min(...windowScores) : 0;
  const classification = classify(delta, trend, volatility, insufficientHistory);

  capabilities.global = {
    baseline,
    current,
    delta,
    percentDelta,
    trend,
    volatility,
    classification,
    insufficientHistory
  };

  const teamDeviation =
    teamGovernance && teamGovernance.summary
      ? TEAM_DEVIATION_MAP[teamGovernance.summary.teamLoadStatus] || 'healthy'
      : 'healthy';

  return {
    capabilities,
    summary: {
      healthyCount: classification === 'healthy' ? 1 : 0,
      driftingCount: classification === 'drifting' ? 1 : 0,
      regressingCount: classification === 'regressing' ? 1 : 0,
      highVolatilityCount: volatility > VOLATILITY_HIGH ? 1 : 0,
      teamDeviation
    }
  };
}

export default { analyzeIntegrityDeviations };
