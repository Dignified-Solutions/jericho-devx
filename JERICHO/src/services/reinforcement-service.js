import { scoreIntegrity } from '../core/scoring-engine.js';

/**
 * Reinforce behaviors by updating integrity scores and suggesting next actions.
 */
export function applyReinforcement(taskBoard) {
  const history = taskBoard.history || [];
  const integrityScore = scoreIntegrity(history);

  const refreshedTasks = (taskBoard.tasks || []).map((task) => {
    if (task.status === 'done') return task;
    const nudge = integrityScore < 50 ? 'Add accountability' : 'Maintain pace';
    return { ...task, integrityScore, nudge };
  });

  return {
    ...taskBoard,
    integrityScore,
    tasks: refreshedTasks
  };
}
