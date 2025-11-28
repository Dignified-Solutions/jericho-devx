const DEFAULT_MAX = 10;

export function compressTasksForCycle({ goal, nextCycleIndex = 0, tasks = [], governance = {}, strategicCalendar = {} }) {
  void goal;
  const baseCap = governance.recommendedMaxTasksPerCycle ?? DEFAULT_MAX;
  const cycle = (strategicCalendar.cycles || []).find((c) => c.index === nextCycleIndex) || null;

  let capacityMultiplier = 1;
  if (cycle) {
    if (cycle.readiness === 'heavy') capacityMultiplier = 0.7;
    else if (cycle.readiness === 'light') capacityMultiplier = 1.2;
  }

  let maxAllowed = Math.round(baseCap * capacityMultiplier);
  maxAllowed = Math.max(3, Math.min(25, maxAllowed));

  const scored = (tasks || []).map((task) => {
    const score = scoreTask(task, nextCycleIndex, cycle);
    const reasonCodes = [];
    if ((task.impactWeight ?? 0) >= 0.7) reasonCodes.push('high_impact');
    if (task.deadlineCycle != null && task.deadlineCycle <= nextCycleIndex) reasonCodes.push('deadline_now_or_past');
    if (task.deadlineCycle != null && task.deadlineCycle === nextCycleIndex + 1) reasonCodes.push('deadline_soon');
    if ((task.difficulty ?? 3) >= 4) reasonCodes.push('high_difficulty');
    return { task, score, reasonCodes };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(a.task.id).localeCompare(String(b.task.id));
  });

  const kept = [];
  const deferred = [];
  const dropped = [];

  scored.forEach((item, idx) => {
    const task = item.task;
    const deadlineCycle = task.deadlineCycle;
    const withinCap = idx < maxAllowed;
    const decision = { id: task.id, score: item.score, cycle: null, action: 'drop', reasonCodes: [...item.reasonCodes] };

    if (withinCap) {
      decision.action = 'keep';
      decision.cycle = nextCycleIndex;
      decision.reasonCodes.push('kept_within_capacity');
      kept.push(decision);
      return;
    }

    if (deadlineCycle != null) {
      const delta = deadlineCycle - nextCycleIndex;
      if (delta >= 2) {
        decision.action = 'defer';
        decision.cycle = deadlineCycle - 1;
        decision.reasonCodes.push('deferred_due_to_capacity');
        deferred.push(decision);
        return;
      }
      // deadline imminent or past
      decision.action = 'drop';
      decision.reasonCodes.push('dropped_due_to_deadline_and_capacity');
      dropped.push(decision);
      return;
    }

    if (item.score >= 0.4) {
      decision.action = 'defer';
      decision.cycle = nextCycleIndex + 1;
      decision.reasonCodes.push('deferred_due_to_capacity');
      deferred.push(decision);
    } else {
      decision.action = 'drop';
      decision.reasonCodes.push('dropped_low_score');
      dropped.push(decision);
    }
  });

  return {
    kept,
    deferred,
    dropped,
    summary: {
      maxAllowed,
      requested: tasks.length,
      keptCount: kept.length,
      deferredCount: deferred.length,
      droppedCount: dropped.length
    }
  };
}

function scoreTask(task, nextCycleIndex, cycle) {
  const impact = task.impactWeight ?? 0;
  const diff = task.difficulty ?? 3;
  const difficultyScore = diff <= 3 ? 1.0 : 0.7;
  const alignedScore = cycle ? (cycle.milestones.length > 0 ? 1.0 : 0.8) : 1.0;
  const deadlineScore = deadlineProximity(task.deadlineCycle, nextCycleIndex);
  const score = impact * 0.5 + deadlineScore * 0.3 + difficultyScore * 0.1 + alignedScore * 0.1;
  return clamp(score, 0, 1);
}

function deadlineProximity(deadlineCycle, nextCycleIndex) {
  if (deadlineCycle == null) return 0;
  const d = deadlineCycle - nextCycleIndex;
  if (d <= 0) return 1.0;
  if (d === 1) return 0.8;
  if (d === 2) return 0.5;
  return 0.2;
}

function clamp(val, min, max) {
  const num = Number(val);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}
