import { promises as fs } from 'fs';
import path from 'path';
import { mockGoals, mockIdentity } from './mock-data.js';
import { EMPTY_TEAM_STATE, normalizeTeam } from '../core/team-model.js';

const STORE_PATH =
  process.env.STATE_PATH || path.join(process.cwd(), 'src', 'data', 'state.json');

const defaultState = buildState({
  goals: mockGoals.goals || [],
  identity: mockIdentity || {},
  history: [],
  tasks: [],
  integrity: {
    score: 0,
    completedCount: 0,
    pendingCount: 0,
    lastRun: null
  },
  team: EMPTY_TEAM_STATE
});

export async function readState() {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf-8');
    return buildState(JSON.parse(raw));
  } catch (err) {
    if (err.code === 'ENOENT') {
      await writeState(defaultState);
      return defaultState;
    }
    throw err;
  }
}

export async function writeState(state) {
  const next = buildState(state);
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(next, null, 2));
  return next;
}

export async function appendGoal(goal) {
  const current = await readState();
  const goals = [...(current.goals || []), goal];
  return writeState({ ...current, goals });
}

export async function updateIdentity(domain, capability, level) {
  const current = await readState();
  const identity = {
    ...(current.identity || {}),
    [domain]: { ...(current.identity?.[domain] || {}), [capability]: { level } }
  };
  return writeState({ ...current, identity });
}

export async function recordTaskStatus(taskId, status) {
  const current = await readState();
  const history = [...(current.history || []), { id: taskId, status, at: new Date().toISOString() }];
  const tasks = (current.tasks || []).map((task) =>
    task.id === taskId ? { ...task, status } : task
  );
  return writeState({ ...current, history, tasks });
}

function buildState(raw) {
  const base = raw || {};
  return {
    goals: Array.isArray(base.goals) ? base.goals : [],
    identity: typeof base.identity === 'object' && base.identity !== null ? base.identity : {},
    history: Array.isArray(base.history) ? base.history : [],
    tasks: Array.isArray(base.tasks) ? base.tasks : [],
    integrity: normalizeIntegrity(base.integrity),
    team: normalizeTeam(base.team)
  };
}

function normalizeIntegrity(integrity) {
  if (!integrity || typeof integrity !== 'object') {
    return { score: 0, completedCount: 0, pendingCount: 0, lastRun: null };
  }
  return {
    score: Number(integrity.score) || 0,
    completedCount: Number(integrity.completedCount) || 0,
    pendingCount: Number(integrity.pendingCount) || 0,
    lastRun: integrity.lastRun || null
  };
}
