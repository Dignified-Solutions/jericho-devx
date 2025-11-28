import { runPipeline } from './pipeline.js';
import { mockGoals, mockIdentity } from '../data/mock-data.js';

const INVALID = { code: 'INVALID_COMMAND', message: 'Invalid command' };

function cloneState(state = {}) {
  return {
    goals: Array.isArray(state.goals) ? [...state.goals] : [],
    identity: state.identity ? JSON.parse(JSON.stringify(state.identity)) : {},
    tasks: Array.isArray(state.tasks) ? JSON.parse(JSON.stringify(state.tasks)) : [],
    history: Array.isArray(state.history) ? JSON.parse(JSON.stringify(state.history)) : [],
    integrity: state.integrity ? { ...state.integrity } : {},
    team: state.team ? JSON.parse(JSON.stringify(state.team)) : undefined
  };
}

function ensureSpec(command, spec) {
  if (!command || typeof command !== 'object') throw INVALID;
  if (!spec || !Array.isArray(spec.allowed)) throw INVALID;
  if (!spec.allowed.includes(command.type)) throw INVALID;
  const schema = spec.schemas?.[command.type];
  if (schema) {
    const payload = command.payload || {};
    for (const [key, type] of Object.entries(schema)) {
      if (!(key in payload)) throw INVALID;
      if (type === 'string' && typeof payload[key] !== 'string') throw INVALID;
      if (type === 'number' && typeof payload[key] !== 'number') throw INVALID;
    }
  }
}

export function interpretCommand(command, spec, state) {
  ensureSpec(command, spec);
  const nextState = cloneState(state);
  const effects = [];
  const payload = command.payload || {};

  switch (command.type) {
    case 'create_goal': {
      const goalId = `goal-${nextState.goals.length + 1}`;
      const goalEntry = payload.text;
      nextState.goals.push(goalEntry);
      effects.push({ type: 'goal_created', goalId, text: goalEntry });
      break;
    }
    case 'update_identity': {
      const { capabilityId, newLevel } = payload;
      if (!capabilityId.includes('.')) throw INVALID;
      const [domain, capability] = capabilityId.split('.');
      nextState.identity[domain] = nextState.identity[domain] || {};
      nextState.identity[domain][capability] = { level: newLevel };
      effects.push({ type: 'identity_updated', capabilityId, newLevel });
      break;
    }
    case 'complete_task':
    case 'miss_task': {
      const status = command.type === 'complete_task' ? 'completed' : 'missed';
      const { taskId } = payload;
      nextState.tasks = (nextState.tasks || []).map((t) =>
        t.id === taskId ? { ...t, status } : t
      );
      nextState.history = [...(nextState.history || []), { id: taskId, status }];
      effects.push({ type: status === 'completed' ? 'task_completed' : 'task_missed', taskId });
      break;
    }
    case 'advance_cycle': {
      const goalInput = nextState.goals?.length ? { goals: nextState.goals } : mockGoals;
      const identity =
        Object.keys(nextState.identity || {}).length ? nextState.identity : mockIdentity;
      const result = runPipeline(goalInput, identity, nextState.history || [], nextState.tasks || []);
      nextState.history = result.history || nextState.history;
      nextState.tasks = result.tasks || nextState.tasks;
      nextState.integrity = result.integrity || nextState.integrity;
      effects.push({ type: 'cycle_advanced' });
      break;
    }
    default:
      throw INVALID;
  }

  return { nextState, effects };
}

export default { interpretCommand };
