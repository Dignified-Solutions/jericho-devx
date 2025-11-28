const DEFAULT_CYCLE_DAYS = 7;
const DEFAULT_MAX_TASKS_PER_CYCLE = 10;

export function evaluateSystemHealth({
  history,
  integritySummary,
  scheduleSummary,
  failureAnalysis,
  forecast
}) {
  const integrityScore = integritySummary?.score ?? 0;
  const fp = failureAnalysis?.failureProfile || {};
  const rec = failureAnalysis?.recommendations || {};
  const gf = forecast?.goalForecast || {};
  const vol = forecast?.volatility || {};
  const sust = forecast?.sustainability || {};

  const { status, reasons } = classifyHealth(integrityScore, fp, gf, vol);
  const drift = detectDrift(scheduleSummary, rec, vol, sust);
  const governance = computeGovernance(status, fp, rec, scheduleSummary, sust, gf, history || []);

  return {
    health: { status, reasons },
    drift,
    governance
  };
}

function classifyHealth(integrityScore, fp, gf, vol) {
  let status = 'green';
  const reasons = [];

  if (integrityScore < 40) {
    status = bumpStatus(status, 'red');
    reasons.push('chronic_low_integrity');
  } else if (integrityScore < 60) {
    status = bumpStatus(status, 'yellow');
    reasons.push('moderate_low_integrity');
  }

  if (fp.highMissRate) {
    status = bumpStatus(status, fp.chronicLowIntegrity ? 'red' : 'yellow');
    reasons.push('high_miss_rate');
  }
  if (fp.highLateRate) {
    reasons.push('high_late_rate');
    status = bumpStatus(status, 'yellow');
  }

  if (gf.projectedDate && gf.onTrack === false) {
    status = bumpStatus(status, 'yellow');
    reasons.push('forecast_past_deadline');
  }

  if ((vol.integrityStdDev ?? 0) > 15 || (vol.identityDeltaStdDev ?? 0) > 0.8) {
    status = bumpStatus(status, 'yellow');
    reasons.push('high_volatility');
  }

  return { status, reasons };
}

function detectDrift(scheduleSummary = {}, rec = {}, vol = {}, sust = {}) {
  let structuralDrift = false;
  let executionDrift = false;
  const notes = [];

  if ((scheduleSummary.totalOverflowTasks || 0) > (scheduleSummary.totalScheduledTasks || 0)) {
    structuralDrift = true;
    notes.push('overflow_dominant');
  }

  if (
    rec.throughputAdjustment === 'decrease' &&
    (scheduleSummary.totalScheduledTasks || 0) > DEFAULT_MAX_TASKS_PER_CYCLE
  ) {
    structuralDrift = true;
    notes.push('overassigned_given_failure');
  }

  if ((vol.integrityStdDev ?? 0) > 20) {
    executionDrift = true;
    notes.push('integrity_instability');
  }

  if ((sust.avgIntegrity ?? 0) < 50 && (rec.cyclesToTargetOnAverage ?? null) === null) {
    executionDrift = true;
    notes.push('no_clear_progress_signal');
  }

  return { structuralDrift, executionDrift, notes };
}

function computeGovernance(status, fp, rec, scheduleSummary = {}, sust = {}, gf = {}, history = []) {
  let recommendedCycleDays = DEFAULT_CYCLE_DAYS;
  let recommendedMaxTasksPerCycle = DEFAULT_MAX_TASKS_PER_CYCLE;
  let enforceIdentityReset = false;
  let enforceGoalReview = false;

  // Cycle days
  if (status === 'red' && fp.highMissRate) {
    recommendedCycleDays = 14;
  } else if (status === 'green' && (sust.avgIntegrity ?? 0) > 75 && (scheduleSummary.totalOverflowTasks || 0) === 0) {
    recommendedCycleDays = 5;
  }

  // Throughput
  if (rec.throughputAdjustment === 'decrease' || rec.throughputAdjustment === 'increase') {
    const factor = rec.throughputFactor ?? 1.0;
    recommendedMaxTasksPerCycle = Math.round(DEFAULT_MAX_TASKS_PER_CYCLE * factor);
  }
  recommendedMaxTasksPerCycle = clamp(recommendedMaxTasksPerCycle, 4, 20);

  // Identity reset
  if (status === 'red' && (sust.avgIntegrity ?? 0) < 40 && (sust.identityDeltaStdDev ?? 0) < 0.3) {
    enforceIdentityReset = true;
  }

  // Goal review
  if (gf.onTrack === false) {
    enforceGoalReview = true;
  } else if (
    !gf.projectedDate &&
    (history.length >= 5) &&
    (sust.avgIntegrity ?? 0) < 50
  ) {
    enforceGoalReview = true;
  } else if (status === 'red' && fp.highMissRate) {
    enforceGoalReview = true;
  }

  return {
    recommendedCycleDays,
    recommendedMaxTasksPerCycle,
    enforceIdentityReset,
    enforceGoalReview
  };
}

function bumpStatus(current, target) {
  const order = ['green', 'yellow', 'red'];
  return order[Math.max(order.indexOf(current), order.indexOf(target))];
}

function clamp(val, min, max) {
  const num = Number(val);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}
