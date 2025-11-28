import { promises as fs } from 'fs';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), 'data-store.json');

const defaultState = {
  goals: [],
  identity: {},
  history: []
};

export async function readState() {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await writeState(defaultState);
      return defaultState;
    }
    throw err;
  }
}

export async function writeState(state) {
  const next = { ...defaultState, ...state };
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
  const history = [...(current.history || []), { id: taskId, status }];
  return writeState({ ...current, history });
}
