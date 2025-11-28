export function compileNarrative(state = {}, pipelineOutput = {}) {
  const goals = Array.isArray(state.goals) ? state.goals : [];
  const requirements = pipelineOutput.requirements || [];
  const gaps = pipelineOutput.gaps || [];
  const integrity = pipelineOutput.integrity || {};
  const taskBoard = pipelineOutput.taskBoard || {};
  const schedule = pipelineOutput.schedule || {};
  const analysis = pipelineOutput.analysis || {};
  const forecast = analysis.forecast || {};
  const systemHealth = analysis.systemHealth || {};
  const cycleGovernance = analysis.cycleGovernance || {};
  const teamNarrative = analysis.teamNarrative || null;

  const identityCount = Object.keys(state.identity || {}).length;
  const tasks = taskBoard.tasks || pipelineOutput.tasks || [];
  const todayPriorityId = schedule.todayPriorityTaskId;
  const nextTask = tasks.find((t) => t.id === todayPriorityId) || null;
  const overflowCount = Array.isArray(schedule.overflowTasks) ? schedule.overflowTasks.length : 0;
  const allowedTasks = taskBoard.summary?.allowedTasks ?? cycleGovernance.allowedTasks ?? null;

  const identityNarrative = [
    `You track ${requirements.length} identity requirements.`,
    `Identity domains recorded: ${identityCount}.`,
    `Open gaps detected: ${gaps.length}.`
  ];

  const goalNarrative = [
    `Goals stored: ${goals.length}.`,
    `Active goal text: ${pipelineOutput.goal?.raw || pipelineOutput.goal?.outcome || 'none'}.`
  ];

  const taskNarrative = [
    `Generated tasks this cycle: ${tasks.length}.`,
    nextTask
      ? `Next priority task: ${nextTask.title || nextTask.id}.`
      : 'No priority task scheduled for today.'
  ];

  const scheduleNarrative = [
    `Today slots: ${schedule.daySlots?.[0]?.slots?.length ?? 0}.`,
    `Overflow tasks: ${overflowCount}.`,
    allowedTasks != null ? `Cycle cap: ${allowedTasks} tasks.` : 'Cycle cap not set.'
  ];

  const governanceNarrative = [
    `Governance mode: ${cycleGovernance.mode || 'unknown'}.`,
    `Flags: ${JSON.stringify(cycleGovernance.flags || {})}.`,
    `Advisories: ${(cycleGovernance.advisories || []).join(', ') || 'none'}.`
  ];

  const forecastCycles = forecast.goalForecast?.cyclesToTargetOnAverage ?? null;
  const forecastOnTrack = forecast.goalForecast?.onTrack;
  const forecastNarrative = [
    `Projected cycles needed: ${forecastCycles ?? 'unknown'}.`,
    `On-track status: ${forecastOnTrack === undefined ? 'unknown' : String(forecastOnTrack)}.`
  ];

  const metaHealthNarrative = [
    `System health status: ${systemHealth.health?.status || 'unknown'}.`,
    `Health reasons: ${(systemHealth.health?.reasons || []).join(', ') || 'none'}.`,
    `Integrity score: ${integrity.score ?? 0}.`
  ];

  const summary = `Mode=${cycleGovernance.mode || 'unknown'}; Integrity=${integrity.score ?? 0}; Tasks=${tasks.length}; Overflow=${overflowCount}.`;

  return {
    identityNarrative,
    goalNarrative,
    taskNarrative,
    scheduleNarrative,
    governanceNarrative,
    forecastNarrative,
    metaHealthNarrative,
    summary,
    teamNarrative
  };
}

export default { compileNarrative };
