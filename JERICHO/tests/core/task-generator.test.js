import { jest } from '@jest/globals';
import { generateTasksForCycle } from '../../src/core/task-generator.js';

describe('generateTasksForCycle', () => {
  const goal = {
    id: 'g1',
    raw: 'I will launch an app by 2026-03-01',
    outcome: 'I will launch an app',
    metric: '',
    deadline: '2026-03-01T00:00:00.000Z',
    type: 'event'
  };

  const rankedGaps = [
    {
      requirementId: 'r1',
      domain: 'Execution',
      capability: 'discipline',
      targetLevel: 8,
      currentLevel: 6,
      weight: 0.5,
      rawGap: 2,
      weightedGap: 1,
      rank: 1
    },
    {
      requirementId: 'r2',
      domain: 'Execution',
      capability: 'consistency',
      targetLevel: 7,
      currentLevel: 3,
      weight: 0.3,
      rawGap: 4,
      weightedGap: 1.2,
      rank: 2
    },
    {
      requirementId: 'r3',
      domain: 'Planning',
      capability: 'roadmapping',
      targetLevel: 6,
      currentLevel: 3,
      weight: 0.2,
      rawGap: 3,
      weightedGap: 0.6,
      rank: 3
    }
  ];

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('generates tasks ordered by ranked gaps with required fields', () => {
    const tasks = generateTasksForCycle(goal, rankedGaps, { maxTasks: 3, cycleDays: 7 });
    expect(tasks).toHaveLength(3);
    expect(tasks[0].capability).toBe('discipline');
    tasks.forEach((task) => {
      expect(task.id).toBeDefined();
      expect(task.requirementId).toBeDefined();
      expect(task.title).toBeDefined();
      expect(task.description).toBeDefined();
      expect(task.difficulty).toBeGreaterThan(0);
      expect(task.estimatedImpact).toBeGreaterThan(0);
      expect(task.status).toBe('pending');
      expect(task.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(task.dueDate).toBe('2024-01-08T00:00:00.000Z');
    });
  });

  it('respects maxTasks constraint', () => {
    const tasks = generateTasksForCycle(goal, rankedGaps, { maxTasks: 2, cycleDays: 7 });
    expect(tasks).toHaveLength(2);
  });

  it('skips zero-weighted gaps', () => {
    const gaps = [{ ...rankedGaps[0], weightedGap: 0 }];
    const tasks = generateTasksForCycle(goal, gaps, { maxTasks: 3, cycleDays: 7 });
    expect(tasks).toHaveLength(0);
  });

  it('skips gaps without templates and continues processing others', () => {
    const gaps = [
      { ...rankedGaps[0], capability: 'unknown_cap', weightedGap: 1 },
      rankedGaps[1]
    ];
    const tasks = generateTasksForCycle(goal, gaps, { maxTasks: 3, cycleDays: 7 });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].capability).toBe('consistency');
  });

  it('produces deterministic titles/descriptions given same input and time', () => {
    const first = generateTasksForCycle(goal, rankedGaps, { maxTasks: 2, cycleDays: 7 });
    const second = generateTasksForCycle(goal, rankedGaps, { maxTasks: 2, cycleDays: 7 });
    expect(first[0].title).toBe(second[0].title);
    expect(first[0].description).toBe(second[0].description);
    expect(first.length).toBe(second.length);
  });
});
