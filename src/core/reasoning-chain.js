function makeStep(step, cause, effect, rule, scope) {
  return { step, cause, effect, rule, scope };
}

export function buildReasoningChain({ reasoning = {}, pipeline = {}, directives = {} }) {
  const chain = [];
  let step = 1;

  // Identity
  const gapCount = Array.isArray(pipeline.gaps) ? pipeline.gaps.length : 0;
  chain.push(
    makeStep(
      step++,
      `identity_gaps=${gapCount}`,
      `identity_focus=${gapCount > 0 ? 'increase' : 'maintain'}`,
      'identity-gap->task-intensity',
      'identity'
    )
  );

  // Readiness / schedule
  const overflow = Array.isArray(pipeline.schedule?.overflowTasks)
    ? pipeline.schedule.overflowTasks.length
    : 0;
  const todayTask = pipeline.schedule?.todayPriorityTaskId ? 'exists' : 'none';
  chain.push(
    makeStep(
      step++,
      `today_priority=${todayTask}`,
      `overflow=${overflow}`,
      'priority-task->execution-focus',
      'readiness'
    )
  );

  // Governance
  const govMode = pipeline.analysis?.cycleGovernance?.mode || 'unknown';
  const flagsCount = Object.keys(pipeline.analysis?.cycleGovernance?.flags || {}).length;
  chain.push(
    makeStep(step++, `gov_mode=${govMode}`, `gov_flags=${flagsCount}`, 'governance-state->permissions', 'governance')
  );

  // Forecast
  const cycles = pipeline.analysis?.forecast?.goalForecast?.cyclesToTargetOnAverage ?? null;
  chain.push(
    makeStep(
      step++,
      `forecast_cycles=${cycles === null ? 'unknown' : cycles}`,
      `schedule_bias=${cycles !== null && cycles <= 3 ? 'accelerate' : 'normal'}`,
      'forecast->schedule-bias',
      'schedule'
    )
  );

  // Directives
  const dirList = directives.directives || [];
  const dirReasons = dirList.map((d) => d.reasonCode).join('|') || 'none';
  chain.push(
    makeStep(
      step++,
      `directives=${dirList.length}`,
      `reasons=${dirReasons}`,
      'directives->next-actions',
      'directives'
    )
  );

  const summary = `chain_len=${chain.length}; modes=${govMode}; directives=${dirList.length}`;

  return { chain, summary };
}

export default { buildReasoningChain };
