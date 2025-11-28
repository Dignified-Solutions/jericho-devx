import { computeIntegrityScore } from '../core/scoring-engine.js';
import { TASK_STATUS } from '../core/task-status.js';

export function evaluateIntegrity(taskBoard) {
  const tasks = Array.isArray(taskBoard?.history)
    ? taskBoard.history.map((item) => ({
        status:
          item.status === 'done'
            ? TASK_STATUS.COMPLETED
            : item.status === 'missed'
            ? TASK_STATUS.MISSED
            : TASK_STATUS.PENDING,
        estimatedImpact: item.estimatedImpact || 0.5,
        difficulty: item.difficulty || 2,
        onTime: item.onTime ?? true
      }))
    : [];

  const integrity = computeIntegrityScore(tasks);
  const risk = integrity.score < 40 ? 'critical' : integrity.score < 70 ? 'warning' : 'stable';

  return {
    integrityScore: integrity.score,
    risk,
    recommendation: recommendationForRisk(risk)
  };
}

function recommendationForRisk(risk) {
  if (risk === 'critical') return 'Reduce scope and add accountability partner';
  if (risk === 'warning') return 'Tighten daily reviews and shorten tasks';
  return 'Maintain cadence and stretch target slightly';
}
