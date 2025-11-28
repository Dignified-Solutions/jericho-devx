import path from 'path';
import { rm } from 'fs/promises';

const tempStore = path.join(process.cwd(), 'tmp-state.json');
process.env.STATE_PATH = tempStore;

let readState;
let appendGoal;
let updateIdentity;
let recordTaskStatus;
let writeState;
let mockGoals;
let mockIdentity;
let closeDatabase;

beforeAll(async () => {
  const storageModule = await import('../../src/data/storage.js');
  readState = storageModule.readState;
  appendGoal = storageModule.appendGoal;
  updateIdentity = storageModule.updateIdentity;
  recordTaskStatus = storageModule.recordTaskStatus;
  writeState = storageModule.writeState;
  closeDatabase = storageModule.closeDatabase;
  const mockData = await import('../../src/data/mock-data.js');
  mockGoals = mockData.mockGoals;
  mockIdentity = mockData.mockIdentity;
});

describe('storage persistence', () => {
  afterEach(async () => {
    await closeDatabase();
    try {
      await rm(tempStore);
      await rm(`${tempStore}-wal`);
      await rm(`${tempStore}-shm`);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  });

  it('initializes from mock data when missing', async () => {
    const state = await readState();
    expect(state.goals).toBeDefined();
    expect(Array.isArray(state.goals)).toBe(true);
    expect(state.identity).toBeDefined();
    expect(state.team).toBeDefined();
    expect(Array.isArray(state.team.users)).toBe(true);
    expect(Array.isArray(state.team.teams)).toBe(true);
    expect(state.integrity).toMatchObject({
      score: expect.any(Number),
      completedCount: expect.any(Number),
      pendingCount: expect.any(Number),
      lastRun: null
    });
  });

  it('persists goals, identity, and history', async () => {
    await writeState({ goals: mockGoals.goals, identity: mockIdentity, history: [] });
    await appendGoal({ domain: 'focus', capability: 'deep-work', targetLevel: 5 });
    await updateIdentity('health', 'sleep', 4);
    await recordTaskStatus('task-1', 'done');

    const state = await readState();
    expect(state.goals.length).toBeGreaterThanOrEqual(mockGoals.goals.length + 1);
    expect(state.identity.health.sleep.level).toBe(4);
    expect(state.history[state.history.length - 1].status).toBe('done');
    expect(state.integrity).toHaveProperty('score');
    expect(state.team.users.length).toBeGreaterThan(0);
  });
});
