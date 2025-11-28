import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { jest } from '@jest/globals';

async function loadStorage() {
  jest.resetModules();
  return import('../../src/data/storage.js');
}

describe('storage concurrency', () => {
  let tempDir;
  let storage;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jericho-state-'));
    process.env.STATE_PATH = path.join(tempDir, 'state.db');
    storage = await loadStorage();
    await storage.writeState({
      goals: [],
      identity: {},
      history: [],
      tasks: [
        { id: 'task-1', status: 'pending' },
        { id: 'task-2', status: 'pending' }
      ],
      integrity: { score: 0, completedCount: 0, pendingCount: 2, lastRun: null },
      team: { members: [] }
    });
  });

  afterEach(async () => {
    if (storage?.closeDatabase) {
      await storage.closeDatabase();
    }
    await fs.rm(tempDir, { recursive: true, force: true });
    delete process.env.STATE_PATH;
  });

  it('preserves concurrent identity updates', async () => {
    await Promise.all([
      storage.updateIdentity('engineering', 'api', 3),
      storage.updateIdentity('security', 'appsec', 4),
      storage.updateIdentity('engineering', 'platform', 2)
    ]);

    const state = await storage.readState();
    expect(state.identity.engineering.api.level).toBe(3);
    expect(state.identity.engineering.platform.level).toBe(2);
    expect(state.identity.security.appsec.level).toBe(4);
  });

  it('records every parallel task status change without loss', async () => {
    await Promise.all([
      storage.recordTaskStatus('task-1', 'completed'),
      storage.recordTaskStatus('task-2', 'missed'),
      storage.recordTaskStatus('task-1', 'missed')
    ]);

    const state = await storage.readState();
    const task1History = state.history.filter((h) => h.id === 'task-1');
    const task2History = state.history.filter((h) => h.id === 'task-2');

    expect(task1History).toHaveLength(2);
    expect(task2History).toHaveLength(1);
    expect(state.tasks.find((t) => t.id === 'task-1').status).toBe('missed');
    expect(state.tasks.find((t) => t.id === 'task-2').status).toBe('missed');
  });
});
