export function buildReasoningStrip({ pipeline = {}, narrative = {}, directives = {}, scene = {}, state = {} }) {
  const integrity = pipeline.integrity || {};
  const analysis = pipeline.analysis || {};
  const governance = analysis.cycleGovernance || {};
  const forecast = analysis.forecast || {};
  const goal = pipeline.goal || {};
  const schedule = pipeline.schedule || {};
  const directiveList = directives.directives || [];
  const teamGovernance = analysis.teamGovernance || {};

  const goalSummary = {
    activeGoal: goal.raw || goal.outcome || null,
    goalsCount: Array.isArray(state.goals) ? state.goals.length : 0
  };

  const integritySummary = {
    score: integrity.score ?? 0,
    completed: integrity.completedCount ?? 0,
    pending: integrity.pendingCount ?? 0,
    missed: integrity.missedCount ?? 0
  };

  const governanceSummary = {
    mode: governance.mode || 'unknown',
    flags: governance.flags || {},
    advisories: governance.advisories || []
  };
  const teamNarrative = analysis.teamNarrative || {};
  const teamFlags = teamNarrative.governanceFlags || {};

  const forecastSummary = {
    cyclesToTarget: forecast.goalForecast?.cyclesToTargetOnAverage ?? null,
    onTrack: forecast.goalForecast?.onTrack,
    projectedDate: forecast.goalForecast?.projectedDate ?? null
  };

  const priorityRationale = {
    todayTaskId: schedule.todayPriorityTaskId || null,
    overflowCount: Array.isArray(schedule.overflowTasks) ? schedule.overflowTasks.length : 0
  };

  const sceneSummary = {
    panelCount: Array.isArray(scene.panels) ? scene.panels.length : 0,
    panelIds: Array.isArray(scene.panels) ? scene.panels.map((p) => p.id) : []
  };

  const directiveRationale = {
    total: directiveList.length,
    p1: directiveList.filter((d) => d.priority === 1).length,
    reasons: directiveList.map((d) => d.reasonCode)
  };

  const systemHealth = {
    status: analysis.systemHealth?.health?.status || 'unknown',
    reasons: analysis.systemHealth?.health?.reasons || []
  };

  const teamSummary = `mode=${teamFlags.mode || 'execute'}|dev=${teamFlags.deviationRisk || 'low'}|sched=${teamFlags.scheduleRisk || 'on_track'}`;

  const teamGovernanceSummary = {
    loadStatuses: Object.values(teamGovernance.teamLoad || {}).map((d) => d.status),
    delegationCount: teamGovernance.delegation ? Object.keys(teamGovernance.delegation).length : 0,
    summaryStatus: teamGovernance.summary?.teamLoadStatus || 'stable'
  };

  return {
    goalSummary,
    integritySummary,
    governanceSummary,
    forecastSummary,
    priorityRationale,
    sceneSummary,
    directiveRationale,
    systemHealth,
    teamGovernanceSummary,
    teamSummary
  };
}

export default { buildReasoningStrip };
