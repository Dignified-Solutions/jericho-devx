const DEFAULT_READINESS = 50;
const WEIGHTS = {
  forecast: 0.4,
  integrity: 0.3,
  load: 0.2,
  governance: 0.1
};

const LOAD_THRESHOLD_PRIMARY = 0.7;
const INTEGRITY_PRIMARY = 60;
const INTEGRITY_CRITICAL = 30;
const FORECAST_ON_TRACK = 1;
const FORECAST_BEHIND = 0.5;
const FORECAST_FAILING = 0.2;

function classifyGoal(score, forecastStatus, integrityScore, load) {
  if (forecastStatus === 'failing' || integrityScore < INTEGRITY_CRITICAL) return 'critical';
  if (score >= 70 && load <= LOAD_THRESHOLD_PRIMARY && integrityScore >= INTEGRITY_PRIMARY) return 'primary';
  if (score < 40 || load > 0.9) return 'defer';
  return 'watch';
}

function forecastFactor(forecast) {
  if (!forecast) return { factor: FORECAST_BEHIND, missing: true, status: 'unknown' };
  const onTrack = forecast.goalForecast?.onTrack;
  const cycles = forecast.goalForecast?.cyclesToTargetOnAverage;
  if (onTrack === true) return { factor: FORECAST_ON_TRACK, missing: false, status: 'on_track' };
  if (onTrack === false && cycles !== null && cycles !== undefined && cycles <= 2)
    return { factor: FORECAST_BEHIND, missing: false, status: 'behind' };
  return { factor: FORECAST_FAILING, missing: false, status: 'failing' };
}

export function evaluateMultiGoalPortfolio(sessionSnapshot = {}) {
  const snapshot = sessionSnapshot || {};
  const pipeline = snapshot.analysis?.pipeline || {};
  const goals = Array.isArray(pipeline.goals) ? pipeline.goals : snapshot.state?.goals || [];
  const integrity = pipeline.integrity || {};
  const schedule = pipeline.schedule || {};
  const directives = pipeline.analysis?.cycleGovernance || {};

  const perGoal = goals.map((goal, idx) => {
    const goalId = goal.id || `goal-${idx}`;
    const goalTitle = goal.raw || goal.outcome || String(goal);
    const goalForecast = pipeline.analysis?.forecast || null;
    const f = forecastFactor(goalForecast);
    const integrityScore = integrity.score ?? DEFAULT_READINESS;
    const load = schedule.daySlots?.length ? Math.min(1, (schedule.overflowTasks?.length || 0) / (schedule.daySlots.length || 1)) : 0;
    const govRisk = directives.flags ? Object.keys(directives.flags).length : 0;

    const readinessScore =
      (f.factor * 100) * WEIGHTS.forecast +
      (integrityScore) * WEIGHTS.integrity +
      ((1 - load) * 100) * WEIGHTS.load +
      ((govRisk === 0 ? 100 : 50)) * WEIGHTS.governance;

    const readiness = Math.round(readinessScore);
    const classification = classifyGoal(readiness, f.status, integrityScore, load);

    return {
      goalId,
      title: goalTitle,
      readiness,
      classification,
      forecastStatus: f.status,
      missingForecast: f.missing,
      integrityScore,
      load,
      governanceFlags: govRisk
    };
  });

  const primaryGoals = perGoal.filter((g) => g.classification === 'primary').map((g) => g.goalId);
  const criticalGoals = perGoal.filter((g) => g.classification === 'critical').map((g) => g.goalId);
  const deferGoals = perGoal.filter((g) => g.classification === 'defer').map((g) => g.goalId);
  const activeGoalCount = perGoal.length;
  const overcommitted = primaryGoals.length + criticalGoals.length > 3;
  const dominant = perGoal
    .slice()
    .sort((a, b) => {
      if (b.readiness !== a.readiness) return b.readiness - a.readiness;
      return a.goalId.localeCompare(b.goalId);
    })[0] || null;

  const conflictNotes = [];
  if (overcommitted) conflictNotes.push('too_many_primary');
  if (criticalGoals.length > 1) conflictNotes.push('critical_deadlines_clustered');
  if (!conflictNotes.length) conflictNotes.push('none');

  return {
    goals: perGoal,
    portfolio: {
      activeGoalCount,
      primaryGoals,
      criticalGoals,
      deferGoals,
      overcommitted,
      dominantGoalId: dominant?.goalId || null,
      conflictNotes
    }
  };
}

export default { evaluateMultiGoalPortfolio };
