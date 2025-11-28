export function evaluateCycleGovernance({
  goal,
  nextCycleIndex = 0,
  systemHealth = {},
  failureAnalysis = {},
  forecast = {},
  strategicCalendar = {},
  compressedPlan = {},
  portfolioAnalysis = {}
}) {
  void strategicCalendar;
  const baseAllowed = compressedPlan?.summary?.keptCount ?? 0;
  let allowedTasks = baseAllowed;

  const failureProfile = failureAnalysis.failureProfile || {};

  const highFailureRate =
    !!failureAnalysis &&
    ((failureAnalysis.lateRate ?? 0) >= 0.5 || (failureAnalysis.chronicMissStreak ?? 0) >= 3 || failureProfile.highLateRate || failureProfile.highMissRate);

  void (failureAnalysis && failureAnalysis.trend === 'improving');

  let deadlineThreat = false;
  const gf = forecast?.goalForecast || {};
  if (gf.onTrack === false) {
    deadlineThreat = true;
  } else if (typeof goal?.deadlineDays === 'number' && goal.deadlineDays <= 30 && gf.projectedDate) {
    deadlineThreat = true;
  }

  const domains = portfolioAnalysis?.currentMix?.domains || [];
  const hasUnder = domains.some((d) => d.status === 'under');
  const hasOver = domains.some((d) => d.status === 'over');
  const portfolioImbalance = hasUnder || hasOver;

  let healthLevel = 1;
  const healthStatus = systemHealth?.health?.status;
  if (healthStatus === 'yellow') healthLevel = 2;
  if (healthStatus === 'red') healthLevel = 3;

  const requireIdentityReset = !!systemHealth?.governance?.enforceIdentityReset;
  const requireGoalReview = !!systemHealth?.governance?.enforceGoalReview;

  let severity = 'low';
  if (healthLevel === 3 || (highFailureRate && deadlineThreat)) {
    severity = 'high';
  } else if (healthLevel === 2 || highFailureRate || deadlineThreat) {
    severity = 'medium';
  }

  let mode = 'execute';
  if (requireIdentityReset) mode = 'reset_identity';
  else if (requireGoalReview) mode = 'review_goal';
  else if (healthLevel === 3 && highFailureRate) mode = 'halt';
  else if (severity === 'medium' || severity === 'high') mode = 'conserve';
  else mode = 'execute';

  if (mode === 'halt') {
    allowedTasks = 0;
  } else if (mode === 'reset_identity' || mode === 'review_goal') {
    allowedTasks = Math.min(allowedTasks, 2);
  } else if (mode === 'conserve') {
    const scale = severity === 'high' ? 0.4 : severity === 'medium' ? 0.7 : 1.0;
    allowedTasks = Math.floor(allowedTasks * scale);
    allowedTasks = Math.max(0, allowedTasks);
  }
  if (allowedTasks > baseAllowed) allowedTasks = baseAllowed;

  const flags = {
    requireIdentityReset,
    requireGoalReview,
    highFailureRisk: highFailureRate,
    deadlineThreat,
    portfolioImbalance
  };

  const advisories = [];
  if (healthStatus) advisories.push(`health_${healthStatus}`);
  if (highFailureRate) advisories.push('high_failure_rate');
  if (deadlineThreat) advisories.push('deadline_threat');
  if (portfolioImbalance) advisories.push('portfolio_imbalanced');
  advisories.push(`mode_${mode}`);
  if (allowedTasks < baseAllowed) {
    advisories.push(`allowed_tasks_reduced_from_${baseAllowed}_to_${allowedTasks}`);
  }

  return {
    cycleIndex: nextCycleIndex,
    mode,
    allowedTasks,
    severity,
    flags,
    advisories
  };
}
