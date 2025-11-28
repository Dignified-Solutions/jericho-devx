import {
  TASK_STATUS,
  completeTask,
  missTask,
  isTaskOverdue,
  summarizeTaskSet
} from '../../src/core/task-status.js';

describe('task-status', () => {
  const baseTask = {
    id: 't1',
    requirementId: 'r1',
    domain: 'Execution',
    capability: 'discipline',
    title: 'Honor a fixed work block',
    description: '',
    difficulty: 2,
    estimatedImpact: 0.6,
    dueDate: '2025-01-10T12:00:00.000Z',
    status: TASK_STATUS.PENDING,
    createdAt: '2025-01-01T00:00:00.000Z'
  };

  it('completes on time', () => {
    const completed = completeTask(baseTask, '2025-01-10T11:00:00.000Z');
    expect(completed.status).toBe(TASK_STATUS.COMPLETED);
    expect(completed.onTime).toBe(true);
    expect(completed.completedAt).toBe('2025-01-10T11:00:00.000Z');
    expect(baseTask.status).toBe(TASK_STATUS.PENDING);
  });

  it('completes late', () => {
    const completed = completeTask(baseTask, '2025-01-10T13:00:00.000Z');
    expect(completed.status).toBe(TASK_STATUS.COMPLETED);
    expect(completed.onTime).toBe(false);
  });

  it('completes with Date instance', () => {
    const now = new Date('2025-01-10T11:00:00.000Z');
    const completed = completeTask(baseTask, now);
    expect(completed.completedAt).toBe('2025-01-10T11:00:00.000Z');
  });

  it('marks missed tasks', () => {
    const missed = missTask(baseTask, '2025-01-11T09:00:00.000Z');
    expect(missed.status).toBe(TASK_STATUS.MISSED);
    expect(missed.onTime).toBe(false);
    expect(missed.missedAt).toBe('2025-01-11T09:00:00.000Z');
    expect(missed.completedAt).toBeUndefined();
  });

  it('detects overdue pending tasks', () => {
    const overdue = isTaskOverdue(baseTask, '2025-01-11T00:00:00.000Z');
    expect(overdue).toBe(true);
    const notOverdue = isTaskOverdue(baseTask, '2025-01-09T00:00:00.000Z');
    expect(notOverdue).toBe(false);
    const completed = completeTask(baseTask, '2025-01-11T00:00:00.000Z');
    expect(isTaskOverdue(completed, '2025-01-12T00:00:00.000Z')).toBe(false);
  });

  it('summarizes task sets', () => {
    const completed = completeTask(baseTask, '2025-01-10T11:00:00.000Z');
    const missed = missTask(baseTask, '2025-01-11T09:00:00.000Z');
    const summary = summarizeTaskSet([completed, missed, baseTask, baseTask]);
    expect(summary.total).toBe(4);
    expect(summary.completed).toBe(1);
    expect(summary.missed).toBe(1);
    expect(summary.pending).toBe(2);
  });
});
