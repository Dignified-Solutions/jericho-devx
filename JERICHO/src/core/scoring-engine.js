/**
 * Score a task based on gap severity and capability criticality.
 * Returns a value between 1 (lowest) and 100 (highest).
 */
export function scoreTaskPriority(task, gap) {
  const severityWeight = clamp(gap?.gap ?? 0, 0, 5);
  const targetWeight = clamp(gap?.targetLevel ?? 0, 0, 5);
  const capabilityWeight = criticalityForCapability(task.capability);

  const rawScore = severityWeight * 3 + targetWeight * 2 + capabilityWeight;
  return clamp(Math.round(rawScore * 4), 1, 100);
}

export function scoreIntegrity(taskHistory) {
  if (!Array.isArray(taskHistory) || taskHistory.length === 0) {
    return 0;
  }
  const completed = taskHistory.filter((item) => item.status === 'done').length;
  const missed = taskHistory.filter((item) => item.status === 'missed').length;
  const onTrack = taskHistory.filter((item) => item.status === 'pending').length;

  const completionRate = completed / taskHistory.length;
  const penalty = missed * 0.1;
  const buffer = onTrack * 0.02;

  const integrity = Math.max(0, Math.min(1, completionRate - penalty + buffer));
  return Math.round(integrity * 100);
}

function criticalityForCapability(capability) {
  if (capability?.includes('deep')) return 5;
  if (capability?.includes('movement')) return 4;
  if (capability?.includes('sleep')) return 4;
  return 2;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
