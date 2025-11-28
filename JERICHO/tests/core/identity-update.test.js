import { applyIdentityUpdate } from '../../src/core/identity-update.js';

const disciplineEntry = { id: 'i1', domain: 'Execution', capability: 'discipline', level: 5 };

const disciplineGap = {
  requirementId: 'r1',
  domain: 'Execution',
  capability: 'discipline',
  targetLevel: 8,
  currentLevel: 5,
  weight: 0.5,
  rawGap: 3,
  weightedGap: 1.5,
  rank: 1
};

const integrityHigh = {
  score: 80,
  completedCount: 1,
  missedCount: 0,
  pendingCount: 0,
  rawTotal: 1,
  maxPossible: 1
};

describe('applyIdentityUpdate', () => {
  it('updates capability with positive integrity and activity', () => {
    const tasks = [
      {
        id: 't1',
        domain: 'Execution',
        capability: 'discipline',
        estimatedImpact: 0.8,
        status: 'completed'
      }
    ];
    const { updatedIdentity, changes } = applyIdentityUpdate(
      [disciplineEntry],
      [disciplineGap],
      integrityHigh,
      tasks
    );

    expect(updatedIdentity[0].level).toBeGreaterThan(5);
    expect(updatedIdentity[0].level).toBeLessThanOrEqual(8);
    expect(changes).toHaveLength(1);
    expect(changes[0].delta).toBeGreaterThan(0);
  });

  it('no update when no tasks for capability', () => {
    const tasks = [
      {
        id: 't1',
        domain: 'Execution',
        capability: 'consistency',
        estimatedImpact: 0.8,
        status: 'completed'
      }
    ];
    const { updatedIdentity, changes } = applyIdentityUpdate(
      [disciplineEntry],
      [disciplineGap],
      integrityHigh,
      tasks
    );

    expect(updatedIdentity[0].level).toBe(5);
    expect(changes).toHaveLength(0);
  });

  it('no update when integrity is zero', () => {
    const tasks = [
      {
        id: 't1',
        domain: 'Execution',
        capability: 'discipline',
        estimatedImpact: 0.8,
        status: 'completed'
      }
    ];
    const integrityZero = { ...integrityHigh, score: 0 };
    const { updatedIdentity, changes } = applyIdentityUpdate(
      [disciplineEntry],
      [disciplineGap],
      integrityZero,
      tasks
    );

    expect(updatedIdentity[0].level).toBe(5);
    expect(changes).toHaveLength(0);
  });

  it('clamps to target and bounds', () => {
    const entry = { id: 'i2', domain: 'Execution', capability: 'discipline', level: 9 };
    const gap = { ...disciplineGap, targetLevel: 10, rawGap: 1 };
    const tasks = [
      { id: 't1', domain: 'Execution', capability: 'discipline', estimatedImpact: 1, status: 'completed' }
    ];
    const { updatedIdentity } = applyIdentityUpdate([entry], [gap], integrityHigh, tasks);
    expect(updatedIdentity[0].level).toBeLessThanOrEqual(10);
    expect(updatedIdentity[0].level).toBeGreaterThanOrEqual(1);
  });

  it('caps step to MAX_STEP and gap', () => {
    const entry = { id: 'i3', domain: 'Execution', capability: 'discipline', level: 2 };
    const gap = { ...disciplineGap, targetLevel: 10, rawGap: 8 };
    const tasks = [
      { id: 't1', domain: 'Execution', capability: 'discipline', estimatedImpact: 1, status: 'completed' }
    ];
    const { updatedIdentity } = applyIdentityUpdate([entry], [gap], integrityHigh, tasks);
    expect(updatedIdentity[0].level).toBeLessThanOrEqual(4);
  });

  it('no update when rawGap is zero', () => {
    const gap = { ...disciplineGap, rawGap: 0 };
    const tasks = [
      { id: 't1', domain: 'Execution', capability: 'discipline', estimatedImpact: 0.8, status: 'completed' }
    ];
    const { updatedIdentity, changes } = applyIdentityUpdate(
      [disciplineEntry],
      [gap],
      integrityHigh,
      tasks
    );
    expect(updatedIdentity[0].level).toBe(5);
    expect(changes).toHaveLength(0);
  });

  it('higher activity yields higher delta', () => {
    const entryA = { id: 'ia', domain: 'Execution', capability: 'discipline', level: 3 };
    const entryB = { id: 'ib', domain: 'Execution', capability: 'consistency', level: 3 };
    const gapA = { ...disciplineGap, capability: 'discipline', rawGap: 5 };
    const gapB = { ...disciplineGap, capability: 'consistency', rawGap: 5, requirementId: 'r2' };
    const tasks = [
      { id: 'ta', domain: 'Execution', capability: 'discipline', estimatedImpact: 0.5, status: 'completed' },
      { id: 'tb', domain: 'Execution', capability: 'consistency', estimatedImpact: 1.0, status: 'completed' }
    ];
    const { changes } = applyIdentityUpdate([entryA, entryB], [gapA, gapB], integrityHigh, tasks);
    const deltaA = changes.find((c) => c.capability === 'discipline')?.delta || 0;
    const deltaB = changes.find((c) => c.capability === 'consistency')?.delta || 0;
    expect(deltaB).toBeGreaterThanOrEqual(deltaA);
  });
});
