import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { mockGoals, mockIdentity } from './mock-data.js';
import { EMPTY_TEAM_STATE, normalizeTeam } from '../core/team-model.js';

const DATA_DIR = process.env.JERICHO_DATA_DIR || path.join(os.homedir(), '.jericho');
const STORE_PATH = process.env.STATE_PATH || path.join(DATA_DIR, 'state.db');

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

let dbInstance = null;
let dbReady = null;

async function getDatabase() {
  if (dbReady) return dbReady;

  dbReady = (async () => {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    const db = new Database(STORE_PATH);
    db.pragma('journal_mode = WAL');
    db.exec('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)');

    const existing = db.prepare('SELECT data FROM state WHERE id = 1').get();
    if (!existing) {
      db.prepare('INSERT INTO state (id, data) VALUES (1, ?)').run(JSON.stringify(defaultState));
    }

    dbInstance = db;
    return db;
  })();

  return dbReady;
}

export async function readState() {
  const db = await getDatabase();
  const row = db.prepare('SELECT data FROM state WHERE id = 1').get();
  if (!row) {
    await writeState(defaultState);
    return defaultState;
  }
  return buildState(JSON.parse(row.data));
}

export async function writeState(state) {
  return updateState(() => state);
}

export async function appendGoal(goal) {
  return updateState((current) => {
    const goals = [...(current.goals || []), goal];
    return { ...current, goals };
  });
}

export async function updateIdentity(domain, capability, level) {
  return updateState((current) => {
    const identity = {
      ...(current.identity || {}),
      [domain]: { ...(current.identity?.[domain] || {}), [capability]: { level } }
    };
    return { ...current, identity };
  });
}

export async function recordTaskStatus(taskId, status) {
  return updateState((current) => {
    const history = [...(current.history || []), { id: taskId, status, at: new Date().toISOString() }];
    const tasks = (current.tasks || []).map((task) =>
      task.id === taskId ? { ...task, status } : task
    );
    return { ...current, history, tasks };
  });
}

export async function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
  }
  dbInstance = null;
  dbReady = null;
}

async function updateState(mutator) {
  const db = await getDatabase();
  const tx = db.transaction((nextStateBuilder) => {
    const row = db.prepare('SELECT data FROM state WHERE id = 1').get();
    const current = row ? buildState(JSON.parse(row.data)) : defaultState;
    const next = buildState(nextStateBuilder(current));
    db.prepare(
      'INSERT INTO state (id, data) VALUES (1, @data) ON CONFLICT(id) DO UPDATE SET data = excluded.data'
    ).run({ data: JSON.stringify(next) });
    return next;
  });
  return tx(mutator);
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
