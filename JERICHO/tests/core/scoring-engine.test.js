import { TASK_STATUS } from '../../src/core/task-status.js';
import { computeIntegrityScore, explainIntegrityScore } from '../../src/core/scoring-engine.js';

const baseTasks = [
  {
    id: 't1',
    requirementId: 'r1',
    domain: 'Execution',
    capability: 'discipline',
    title: 'Honor a fixed work block',
    description: '',
    difficulty: 2,
    estimatedImpact: 0.8,
    dueDate: '2025-01-10T12:00:00.000Z',
    status: TASK_STATUS.COMPLETED,
    createdAt: '2025-01-01T00:00:00.000Z',
    completedAt: '2025-01-10T11:00:00.000Z',
    onTime: true
  },
  {
    id: 't2',
    requirementId: 'r2',
    domain: 'Execution',
    capability: 'consistency',
    title: 'Set and follow a daily start time',
    description: '',
    difficulty: 3,
    estimatedImpact: 0.6,
    dueDate: '2025-01-10T12:00:00.000Z',
    status: TASK_STATUS.COMPLETED,
    createdAt: '2025-01-01T00:00:00.000Z',
    completedAt: '2025-01-10T13:00:00.000Z',
    onTime: false
  },
  {
    id: 't3',
    requirementId: 'r3',
    domain: 'Execution',
    capability: 'roadmapping',
    title: 'Create a simple roadmap',
    description: '',
    difficulty: 1,
    estimatedImpact: 0.7,
    dueDate: '2025-01-10T12:00:00.000Z',
    status: TASK_STATUS.MISSED,
    createdAt: '2025-01-01T00:00:00.000Z',
    missedAt: '2025-01-11T00:00:00.000Z',
    onTime: false
  },
  {
    id: 't4',
    requirementId: 'r4',
    domain: 'Execution',
    capability: 'time_blocking',
    title: 'Time-block your next week',
    description: '',
    difficulty: 2,
    estimatedImpact: 0.5,
    dueDate: '2025-01-10T12:00:00.000Z',
    status: TASK_STATUS.PENDING,
    createdAt: '2025-01-01T00:00:00.000Z'
  }
];

describe('computeIntegrityScore', () => {
  it('returns 100 when all completed on time', () => {
    const tasks = baseTasks.slice(0, 2).map((t) => ({ ...t, onTime: true }));
    const result = computeIntegrityScore(tasks);
    expect(result.score).toBe(100);
    expect(result.missedCount).toBe(0);
    expect(result.pendingCount).toBe(0);
    expect(result.rawTotal).toBeCloseTo(result.maxPossible);
  });

  it('mix of on-time, late, missed, pending yields mid score', () => {
    const result = computeIntegrityScore(baseTasks);
    expect(result.completedCount).toBe(2);
    expect(result.missedCount).toBe(1);
    expect(result.pendingCount).toBe(1);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
  });

  it('all tasks missed yields zero score', () => {
    const tasks = baseTasks.slice(0, 3).map((t) => ({ ...t, status: TASK_STATUS.MISSED }));
    const result = computeIntegrityScore(tasks);
    expect(result.score).toBe(0);
    expect(result.rawTotal).toBeLessThan(0);
    expect(result.maxPossible).toBeGreaterThan(0);
  });

  it('no tasks returns zeros', () => {
    const result = computeIntegrityScore([]);
    expect(result.score).toBe(0);
    expect(result.maxPossible).toBe(0);
    expect(result.completedCount).toBe(0);
    expect(result.missedCount).toBe(0);
    expect(result.pendingCount).toBe(0);
  });

  it('score is bounded between 0 and 100', () => {
    const tasks = [
      {
        ...baseTasks[0],
        estimatedImpact: 100,
        status: TASK_STATUS.MISSED
      }
    ];
    const result = computeIntegrityScore(tasks);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('explainIntegrityScore', () => {
  it('provides breakdown with completion and on-time rates', () => {
    const explanation = explainIntegrityScore(baseTasks);
    expect(explanation.score).toBeGreaterThan(0);
    expect(explanation.breakdown.totalTasks).toBe(baseTasks.length);
    expect(explanation.breakdown.completedOnTime).toBe(1);
    expect(explanation.breakdown.completedLate).toBe(1);
    expect(explanation.breakdown.missed).toBe(1);
    expect(explanation.breakdown.completionRate).toBeCloseTo(0.5);
    expect(explanation.breakdown.onTimeRate).toBeCloseTo(0.5);
  });
});
