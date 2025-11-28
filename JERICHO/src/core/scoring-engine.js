import { TASK_STATUS } from './task-status.js';

const difficultyWeight = {
  1: 0.8,
  2: 1.0,
  3: 1.2
};

export function computeIntegrityScore(tasks = []) {
  const completed = tasks.filter((t) => t.status === TASK_STATUS.COMPLETED);
  const missed = tasks.filter((t) => t.status === TASK_STATUS.MISSED);
  const pending = tasks.filter((t) => t.status === TASK_STATUS.PENDING);

  let rawTotal = 0;
  let maxPossible = 0;

  for (const task of tasks) {
    const impact = Number(task.estimatedImpact) || 0;
    const diffW = difficultyWeight[task.difficulty] ?? 1.0;

    if (task.status === TASK_STATUS.COMPLETED) {
      const timeW = task.onTime === false ? 0.7 : 1.0;
      const taskScore = impact * diffW * timeW;
      rawTotal += taskScore;
    } else if (task.status === TASK_STATUS.MISSED) {
      rawTotal -= impact;
    }

    maxPossible += impact * diffW;
  }

  if (maxPossible <= 0) {
    return {
      score: 0,
      completedCount: completed.length,
      missedCount: missed.length,
      pendingCount: pending.length,
      rawTotal,
      maxPossible
    };
  }

  const ratio = rawTotal / maxPossible;
  const clamped = Math.max(0, Math.min(1, ratio));
  const integrityScore = Math.round(clamped * 100);

  return {
    score: integrityScore,
    completedCount: completed.length,
    missedCount: missed.length,
    pendingCount: pending.length,
    rawTotal,
    maxPossible
  };
}

export function explainIntegrityScore(tasks = []) {
  const summary = computeIntegrityScore(tasks);
  const completedOnTime = tasks.filter(
    (t) => t.status === TASK_STATUS.COMPLETED && t.onTime === true
  ).length;
  const completedLate = tasks.filter(
    (t) => t.status === TASK_STATUS.COMPLETED && t.onTime === false
  ).length;
  const missed = tasks.filter((t) => t.status === TASK_STATUS.MISSED).length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks ? summary.completedCount / totalTasks : 0;
  const onTimeRate = summary.completedCount ? completedOnTime / summary.completedCount : 0;

  return {
    score: summary.score,
    breakdown: {
      completedOnTime,
      completedLate,
      missed,
      totalTasks,
      completionRate,
      onTimeRate
    }
  };
}
