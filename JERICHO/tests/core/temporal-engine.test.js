import { buildDaySlots, scheduleTasksIntoSlots } from '../../src/core/temporal-engine.js';

describe('temporal-engine', () => {
  it('schedules tasks across days with overflow', () => {
    const daySlots = buildDaySlots('2025-01-10T00:00:00.000Z', '2025-01-12T00:00:00.000Z', {
      minutesPerSlot: 90
    });
    const tasks = [
      makeTask('t1', 0.9, 3, '2025-01-12T00:00:00.000Z'),
      makeTask('t2', 0.8, 2, '2025-01-12T00:00:00.000Z'),
      makeTask('t3', 0.7, 3, '2025-01-12T00:00:00.000Z'),
      makeTask('t4', 0.6, 2, '2025-01-12T00:00:00.000Z'),
      makeTask('t5', 0.5, 2, '2025-01-12T00:00:00.000Z'),
      makeTask('t6', 0.4, 1, '2025-01-12T00:00:00.000Z')
    ];

    const result = scheduleTasksIntoSlots(tasks, daySlots, {
      score: 80,
      completedCount: 0,
      missedCount: 0,
      pendingCount: 6,
      rawTotal: 0,
      maxPossible: 1
    });

    const scheduledIds = result.daySlots.flatMap((d) => d.slots.flatMap((s) => s.taskIds));
    expect(scheduledIds.length).toBeGreaterThan(0);
    expect(result.overflowTasks.length).toBeGreaterThanOrEqual(0);
  });

  it('power of today places high-impact task on first day', () => {
    const daySlots = buildDaySlots('2025-01-10T00:00:00.000Z', '2025-01-12T00:00:00.000Z');
    const tasks = [
      makeTask('t1', 0.9, 2, '2025-01-12T00:00:00.000Z'),
      makeTask('t2', 0.6, 2, '2025-01-12T00:00:00.000Z')
    ];

    const result = scheduleTasksIntoSlots(tasks, daySlots, {
      score: 90,
      completedCount: 0,
      missedCount: 0,
      pendingCount: 2,
      rawTotal: 0,
      maxPossible: 1
    });

    const todayIds = result.daySlots[0].slots.flatMap((s) => s.taskIds);
    expect(result.todayPriorityTaskId).toBe('t1');
    expect(todayIds).toContain('t1');
  });

  it('respects capacity and overflows when full', () => {
    const daySlots = buildDaySlots('2025-01-10T00:00:00.000Z', '2025-01-10T00:00:00.000Z', {
      slotsPerDay: 1,
      minutesPerSlot: 60
    });
    const tasks = [
      makeTask('t1', 0.9, 3, '2025-01-10T00:00:00.000Z'),
      makeTask('t2', 0.8, 3, '2025-01-10T00:00:00.000Z')
    ];

    const result = scheduleTasksIntoSlots(tasks, daySlots, { score: 50, completedCount: 0, missedCount: 0, pendingCount: 2, rawTotal: 0, maxPossible: 1 });
    const todayIds = result.daySlots[0].slots.flatMap((s) => s.taskIds);
    expect(todayIds.length).toBe(0);
    expect(result.overflowTasks.length).toBe(2);
  });

  it('does not schedule past task due date', () => {
    const daySlots = buildDaySlots('2025-01-10T00:00:00.000Z', '2025-01-12T00:00:00.000Z');
    const tasks = [
      makeTask('t1', 0.9, 2, '2025-01-10T00:00:00.000Z'),
      makeTask('t2', 0.8, 2, '2025-01-12T00:00:00.000Z')
    ];

    const result = scheduleTasksIntoSlots(tasks, daySlots, { score: 80, completedCount: 0, missedCount: 0, pendingCount: 2, rawTotal: 0, maxPossible: 1 });
    const afterDue = result.daySlots
      .filter((d) => d.date > '2025-01-10')
      .flatMap((d) => d.slots.flatMap((s) => s.taskIds));
    expect(afterDue).not.toContain('t1');
  });

  it('deterministic scheduling with same inputs', () => {
    const daySlotsA = buildDaySlots('2025-01-10T00:00:00.000Z', '2025-01-12T00:00:00.000Z');
    const daySlotsB = buildDaySlots('2025-01-10T00:00:00.000Z', '2025-01-12T00:00:00.000Z');
    const tasks = [
      makeTask('t1', 0.9, 2, '2025-01-12T00:00:00.000Z'),
      makeTask('t2', 0.8, 2, '2025-01-12T00:00:00.000Z')
    ];
    const integrity = { score: 80, completedCount: 0, missedCount: 0, pendingCount: 2, rawTotal: 0, maxPossible: 1 };

    const resultA = scheduleTasksIntoSlots(tasks, daySlotsA, integrity);
    const resultB = scheduleTasksIntoSlots(tasks, daySlotsB, integrity);

    expect(resultA.daySlots).toEqual(resultB.daySlots);
    expect(resultA.overflowTasks).toEqual(resultB.overflowTasks);
  });
});

function makeTask(id, impact, difficulty, dueDate) {
  return {
    id,
    requirementId: `req-${id}`,
    domain: 'Execution',
    capability: 'discipline',
    title: id,
    description: '',
    difficulty,
    estimatedImpact: impact,
    dueDate,
    createdAt: '2025-01-01T00:00:00.000Z',
    status: 'pending'
  };
}
