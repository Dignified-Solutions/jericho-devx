const DEFAULT_PHASES = 3;
const MIN_PHASES = 2;
const MAX_PHASES = 5;

export function decomposeGoal(goal, identityRequirements = [], forecast = null) {
  const phaseCount = decidePhaseCount(goal, forecast);
  const sortedReqs = [...(identityRequirements || [])].sort((a, b) => scoreReq(b) - scoreReq(a));
  const phases = Array.from({ length: phaseCount }, (_, idx) => ({
    id: `${goal.id}-phase-${idx}`,
    name: `Phase ${idx + 1}`,
    phaseIndex: idx,
    cycleStart: 0,
    cycleEnd: 0,
    requiredCapabilities: []
  }));

  sortedReqs.forEach((req, idx) => {
    const phaseIdx = idx % phaseCount;
    phases[phaseIdx].requiredCapabilities.push({
      requirementId: req.id,
      domain: req.domain,
      capability: req.capability,
      targetLevel: req.targetLevel,
      weight: req.weight
    });
  });

  const cyclesBudget = decideCyclesBudget(goal, forecast, phaseCount);
  const cyclesPerPhase = Math.max(1, Math.floor(cyclesBudget / phaseCount));
  phases.forEach((phase, idx) => {
    phase.cycleStart = idx * cyclesPerPhase;
    phase.cycleEnd = (idx + 1) * cyclesPerPhase - 1;
  });
  if (phases.length) {
    phases[phases.length - 1].cycleEnd = cyclesBudget - 1;
  }

  const projectedCycles = forecast?.goalForecast?.cyclesToTargetOnAverage;
  phases.forEach((phase) => {
    const capCount = phase.requiredCapabilities.length || 0;
    const span = phase.cycleEnd - phase.cycleStart + 1 || 1;
    const density = capCount / span;
    let intensity = 'medium';
    if (density < 0.75) intensity = 'low';
    else if (density > 1.5) intensity = 'high';
    if (projectedCycles && cyclesBudget < projectedCycles && phase.phaseIndex === phases.length - 1) {
      intensity = 'high';
    }
    phase.intensity = intensity;
  });

  return phases;
}

function decidePhaseCount(goal, forecast) {
  const cycles = forecast?.goalForecast?.cyclesToTargetOnAverage;
  if (cycles !== undefined && cycles !== null) {
    if (cycles <= 4) return 2;
    if (cycles <= 8) return 3;
    return clamp(Math.round(cycles / 3) + 2, MIN_PHASES, MAX_PHASES);
  }

  if (goal?.deadlineDays) {
    return clamp(Math.round(goal.deadlineDays / 30), MIN_PHASES, MAX_PHASES);
  }

  return DEFAULT_PHASES;
}

function decideCyclesBudget(goal, forecast, phaseCount) {
  const cycles = forecast?.goalForecast?.cyclesToTargetOnAverage;
  if (cycles !== undefined && cycles !== null) {
    return Math.max(phaseCount, Math.round(cycles));
  }
  if (goal?.deadlineDays) {
    return Math.max(phaseCount, Math.round(goal.deadlineDays / 7));
  }
  return phaseCount * 2;
}

function scoreReq(req) {
  return (req.weight || 0) * 2 + (req.targetLevel || 0) / 10;
}

function clamp(val, min, max) {
  const num = Number(val);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}
