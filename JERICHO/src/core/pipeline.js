import { deriveIdentityRequirements } from './identity-requirements.js';
import { calculateGap } from './gap-analysis.js';
import { generateTasks } from './task-generator.js';
import { applyReinforcement } from '../services/reinforcement-service.js';
import { buildCalendarSyncPayload } from '../services/calendar-sync.js';

/**
 * Run the closed-loop pipeline once for the provided goal input and identity state.
 */
export function runPipeline(goalInput, currentIdentity, history = []) {
  const requirements = deriveIdentityRequirements(goalInput, currentIdentity);
  const gaps = calculateGap(requirements);
  const tasks = generateTasks(gaps);
  const taskBoard = applyReinforcement({ tasks, history });
  const syncPayload = buildCalendarSyncPayload(taskBoard.tasks);

  return {
    requirements,
    gaps,
    taskBoard,
    syncPayload
  };
}
