const MIN_HORIZON = 4;
const MAX_HORIZON = 32;
const intensityWeights = {
  low: 1,
  medium: 2,
  high: 3
};

export function buildStrategicCalendar(goal = {}, milestones = [], forecast = null) {
  const horizon = computeHorizon(goal, milestones, forecast);
  const cycles = Array.from({ length: horizon }, (_, index) => ({
    index,
    milestones: [],
    load: {
      milestoneCount: 0,
      avgIntensity: 0
    },
    readiness: 'normal'
  }));

  const milestoneMap = new Map(milestones.map((m) => [m.id, m]));

  for (const milestone of milestones || []) {
    const start = Math.max(0, milestone.cycleStart ?? 0);
    const end = Math.min(horizon - 1, milestone.cycleEnd ?? milestone.cycleStart ?? 0);
    for (let i = start; i <= end; i++) {
      cycles[i].milestones.push(milestone.id);
    }
  }

  for (const cycle of cycles) {
    const count = cycle.milestones.length;
    const weights = cycle.milestones.map((id) => intensityWeights[milestoneMap.get(id)?.intensity] || 0);
    const avg = weights.length ? average(weights) : 0;
    cycle.load = {
      milestoneCount: count,
      avgIntensity: avg
    };
    cycle.readiness = computeReadiness(count, avg);
  }

  const totalCycles = horizon;
  const phaseCount = milestones.length ? 1 + Math.max(...milestones.map((m) => m.phaseIndex ?? 0)) : 0;
  const averageLoad = totalCycles
    ? cycles.reduce((sum, c) => sum + c.load.milestoneCount, 0) / totalCycles
    : 0;

  return {
    cycles,
    summary: {
      totalCycles,
      phaseCount,
      averageLoad
    }
  };
}

function computeHorizon(goal, milestones, forecast) {
  const maxMilestoneEnd = milestones.length ? Math.max(...milestones.map((m) => m.cycleEnd ?? 0)) : 0;
  let horizon = maxMilestoneEnd + 1;

  const cyclesForecast = forecast?.goalForecast?.cyclesToTargetOnAverage;
  if (cyclesForecast !== undefined && cyclesForecast !== null) {
    horizon = Math.max(horizon, Math.round(cyclesForecast));
  }

  if (goal?.deadlineDays) {
    const deadlineCycles = Math.round(goal.deadlineDays / 7);
    horizon = Math.max(horizon, deadlineCycles);
  }

  horizon = Math.max(MIN_HORIZON, Math.min(MAX_HORIZON, horizon));
  return horizon;
}

function computeReadiness(count, avgIntensity) {
  if (count === 0) return 'light';
  if (avgIntensity <= 1.5 && count <= 2) return 'normal';
  return 'heavy';
}

function average(arr) {
  if (!arr.length) return 0;
  const sum = arr.reduce((acc, n) => acc + (Number(n) || 0), 0);
  return sum / arr.length;
}
