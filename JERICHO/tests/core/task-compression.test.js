import { compressTasksForCycle } from '../../src/core/task-compression.js';

const goal = { id: 'g1' };

function makeTask(id, impact, difficulty, deadlineCycle = null) {
  return {
    id,
    capabilityId: `c-${id}`,
    domain: 'Execution',
    capability: 'discipline',
    difficulty,
    impactWeight: impact,
    deadlineCycle
  };
}

describe('task-compression', () => {
  it('no compression needed when under cap', () => {
    const tasks = [makeTask('t1', 0.9, 2), makeTask('t2', 0.5, 3)];
    const result = compressTasksForCycle({
      goal,
      nextCycleIndex: 0,
      tasks,
      governance: { recommendedMaxTasksPerCycle: 5 },
      strategicCalendar: { cycles: [{ index: 0, milestones: [], load: {}, readiness: 'normal' }] }
    });
    expect(result.kept).toHaveLength(2);
    expect(result.deferred).toHaveLength(0);
    expect(result.dropped).toHaveLength(0);
  });

  it('compresses by capacity', () => {
    const tasks = Array.from({ length: 10 }).map((_, idx) => makeTask(`t${idx}`, 0.5 + idx * 0.01, 3));
    const result = compressTasksForCycle({
      goal,
      nextCycleIndex: 0,
      tasks,
      governance: { recommendedMaxTasksPerCycle: 5 },
      strategicCalendar: { cycles: [{ index: 0, milestones: [], load: {}, readiness: 'normal' }] }
    });
    expect(result.summary.maxAllowed).toBe(5);
    expect(result.kept).toHaveLength(5);
    expect(result.deferred.length + result.dropped.length).toBe(5);
  });

  it('readiness adjusts capacity', () => {
    const tasks = Array.from({ length: 5 }).map((_, idx) => makeTask(`t${idx}`, 0.5, 3));
    const heavy = compressTasksForCycle({
      goal,
      nextCycleIndex: 0,
      tasks,
      governance: { recommendedMaxTasksPerCycle: 5 },
      strategicCalendar: { cycles: [{ index: 0, milestones: [], load: {}, readiness: 'heavy' }] }
    });
    const light = compressTasksForCycle({
      goal,
      nextCycleIndex: 0,
      tasks,
      governance: { recommendedMaxTasksPerCycle: 5 },
      strategicCalendar: { cycles: [{ index: 0, milestones: [], load: {}, readiness: 'light' }] }
    });
    expect(heavy.summary.maxAllowed).toBeLessThan(5);
    expect(light.summary.maxAllowed).toBeGreaterThan(5);
  });

  it('deadline-sensitive tasks are kept or deferred appropriately', () => {
    const tasks = [
      makeTask('due-now', 0.2, 2, 0),
      makeTask('due-soon', 0.2, 2, 1),
      makeTask('later', 0.2, 2, 3),
      makeTask('no-deadline', 0.1, 2, null)
    ];
    const result = compressTasksForCycle({
      goal,
      nextCycleIndex: 0,
      tasks,
      governance: { recommendedMaxTasksPerCycle: 2 },
      strategicCalendar: { cycles: [{ index: 0, milestones: [], load: {}, readiness: 'normal' }] }
    });

    const keptIds = result.kept.map((d) => d.id);
    expect(keptIds).toContain('due-now');
  });

  it('defer vs drop for low score tasks', () => {
    const tasks = [
      makeTask('low1', 0.1, 5, null),
      makeTask('low2', 0.1, 4, null),
      makeTask('low3', 0.1, 4, null),
      makeTask('med', 0.5, 2, 3)
    ];
    const result = compressTasksForCycle({
      goal,
      nextCycleIndex: 0,
      tasks,
      governance: { recommendedMaxTasksPerCycle: 3 },
      strategicCalendar: { cycles: [{ index: 0, milestones: [], load: {}, readiness: 'normal' }] }
    });
    expect(result.deferred.length + result.dropped.length).toBeGreaterThan(0);
    expect(result.kept.some((d) => d.id === 'med')).toBe(true);
    expect(result.dropped.some((d) => d.id === 'low1' || d.id === 'low2' || d.id === 'low3')).toBe(true);
  });

  it('determinism and immutability', () => {
    const tasks = [makeTask('t1', 0.5, 3)];
    const inputs = {
      goal,
      nextCycleIndex: 0,
      tasks,
      governance: { recommendedMaxTasksPerCycle: 3 },
      strategicCalendar: { cycles: [{ index: 0, milestones: [], load: {}, readiness: 'normal' }] }
    };
    const snapshot = JSON.stringify(inputs);
    const res1 = compressTasksForCycle(inputs);
    const res2 = compressTasksForCycle(inputs);
    expect(res1).toEqual(res2);
    expect(JSON.stringify(inputs)).toBe(snapshot);
  });
});
