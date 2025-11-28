function clone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function compareDirectives(a, b) {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return (a.id || '').localeCompare(b.id || '');
}

export function planDirectives(state = {}, pipelineOutput = {}) {
  const directives = [];
  const tbTasks = pipelineOutput.taskBoard?.tasks;
  const tasks =
    Array.isArray(tbTasks) && tbTasks.length > 0 ? tbTasks : pipelineOutput.tasks || [];
  const schedule = pipelineOutput.schedule || {};
  const analysis = pipelineOutput.analysis || {};
  const portfolioDomains = analysis.portfolio?.currentMix?.domains || [];
  const cycleGovernance = analysis.cycleGovernance || {};
  const todayPriorityId = schedule.todayPriorityTaskId;
  const allowedTasks = pipelineOutput.taskBoard?.summary?.allowedTasks ?? cycleGovernance.allowedTasks ?? null;

  // Directive: Complete today's priority task
  if (todayPriorityId) {
    directives.push({
      id: 'directive-today-priority',
      priority: 1,
      command: { type: 'complete_task', payload: { taskId: todayPriorityId } },
      reasonCode: 'TODAY_PRIORITY_TASK',
      reasonParams: { taskId: todayPriorityId },
      scope: 'task'
    });
  }

  // Directive: Overdue high impact tasks
  const cycleStart = schedule.cycleStart ? new Date(schedule.cycleStart).getTime() : null;
  tasks.forEach((task, idx) => {
    const impact = task.estimatedImpact ?? task.impactWeight ?? 0;
    const due = task.dueDate ? new Date(task.dueDate).getTime() : null;
    const overdue =
      cycleStart !== null && due !== null && due < cycleStart && (task.status === 'pending' || !task.status);
    if (overdue && impact >= 0.7) {
      directives.push({
        id: `directive-overdue-${idx}`,
        priority: 1,
        command: { type: 'complete_task', payload: { taskId: task.id } },
        reasonCode: 'OVERDUE_HIGH_IMPACT_TASK',
        reasonParams: { taskId: task.id, impact, dueDate: task.dueDate },
        scope: 'task'
      });
    }
  });

  // Directive: Under-weighted domain rebalance
  const underDomain = portfolioDomains.find((d) => d.status === 'under');
  if (underDomain) {
    // find first capability in state identity within this domain
    let capabilityId = null;
    const identity = state.identity || {};
    const caps = identity[underDomain.domain] || {};
    const capKey = Object.keys(caps)[0];
    if (capKey) capabilityId = `${underDomain.domain}.${capKey}`;
    if (capabilityId) {
      const currentLevel = Number(caps[capKey]?.level) || 1;
      const newLevel = Math.min(10, currentLevel + 1);
      directives.push({
        id: `directive-under-${underDomain.domain}`,
        priority: 2,
        command: { type: 'update_identity', payload: { capabilityId, newLevel } },
        reasonCode: 'UNDERWEIGHT_DOMAIN',
        reasonParams: { domain: underDomain.domain, capabilityId, from: currentLevel, to: newLevel },
        scope: 'identity'
      });
    }
  }

  // Directive: Advance cycle when ready
  const hasP1 = directives.some((d) => d.priority === 1);
  const healthStatus = analysis.systemHealth?.health?.status;
  if (!hasP1 && (healthStatus === 'green' || healthStatus === 'yellow')) {
    directives.push({
      id: 'directive-advance-cycle',
      priority: 2,
      command: { type: 'advance_cycle', payload: {} },
      reasonCode: 'READY_FOR_NEXT_CYCLE',
      reasonParams: { health: healthStatus },
      scope: 'schedule'
    });
  }

  // Directive: Excess capacity load (overflow tasks)
  const overflowCount = Array.isArray(schedule.overflowTasks) ? schedule.overflowTasks.length : 0;
  if (overflowCount > 0 && allowedTasks != null) {
    directives.push({
      id: 'directive-excess-capacity',
      priority: 3,
      command: { type: 'update_identity', payload: { capabilityId: 'Execution.discipline', newLevel: 1 } },
      reasonCode: 'EXCESS_CAPACITY_LOAD',
      reasonParams: { overflowCount, allowedTasks },
      scope: 'governance'
    });
  }

  directives.sort(compareDirectives);

  const p1 = directives.filter((d) => d.priority === 1).length;
  const p2 = directives.filter((d) => d.priority === 2).length;
  const p3 = directives.filter((d) => d.priority === 3).length;

  const summary = `Planner generated ${directives.length} directives (P1: ${p1}, P2: ${p2}, P3: ${p3}).`;

  return { directives, summary };
}

export default { planDirectives };
