import { promises as fs } from 'fs';
import crypto from 'crypto';
import path from 'path';
import { mockGoals, mockIdentity } from './mock-data.js';
import { EMPTY_TEAM_STATE, normalizeTeam } from '../core/team-model.js';

const STORE_PATH =
  process.env.STATE_PATH || path.join(process.cwd(), 'src', 'data', 'state.json');

let currentMeta = normalizeMeta({ version: 0, hash: null, updatedAt: null });

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
  team: EMPTY_TEAM_STATE,
  meta: currentMeta
});

export async function readState() {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf-8');
    const state = buildState(JSON.parse(raw));
    currentMeta = normalizeMeta(state.meta);
    return { ...state, meta: currentMeta };
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
  const meta = nextMeta(next);
  const nextState = { ...next, meta };
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(nextState, null, 2));
  return nextState;
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
    team: normalizeTeam(base.team),
    meta: normalizeMeta(base.meta || base)
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

function normalizeMeta(meta) {
  return {
    version: Number.isFinite(meta?.version) ? Number(meta.version) : 0,
    hash: typeof meta?.hash === 'string' ? meta.hash : null,
    updatedAt: typeof meta?.updatedAt === 'string' ? meta.updatedAt : null
  };
}

function nextMeta(state) {
  const version = (currentMeta.version || 0) + 1;
  const hash = calculateStateHash(state);
  const updatedAt = new Date().toISOString();
  currentMeta = { version, hash, updatedAt };
  return currentMeta;
}

function calculateStateHash(state) {
  const payload = {
    goals: state.goals,
    identity: state.identity,
    history: state.history,
    tasks: state.tasks,
    integrity: state.integrity,
    team: state.team
  };
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
