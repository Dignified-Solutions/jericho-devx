import { jest } from '@jest/globals';
import { runPipeline } from '../../src/core/pipeline.js';

describe('runPipeline closed loop', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('applies identity update, appends history, and schedules tasks', () => {
    const goalInput = { goals: ['I will launch an app by 2026-03-01'] };
    const identity = {
      Execution: { discipline: { level: 5 } }
    };
    const tasks = [
      {
        id: 't1',
        requirementId: 'r1',
        domain: 'Execution',
        capability: 'discipline',
        difficulty: 2,
        estimatedImpact: 0.8,
        status: 'completed',
        onTime: true
      }
    ];

    const result = runPipeline(goalInput, identity, [], tasks);

    expect(result.tasks.length).toBeGreaterThan(0);
    expect(result.integrity.lastRun).toBe('2024-01-01T00:00:00.000Z');
    expect(result.history.length).toBe(1);
    expect(result.identityAfter.find((i) => i.capability === 'discipline')?.level).toBeGreaterThanOrEqual(
      result.identityBefore.find((i) => i.capability === 'discipline')?.level || 0
    );
    expect(result.schedule).toBeDefined();
    expect(result.schedule.daySlots.length).toBeGreaterThan(0);
    if (result.tasks.some((t) => t.estimatedImpact >= 0.7)) {
      expect(result.schedule.todayPriorityTaskId).toBeTruthy();
    }
    expect(result.analysis).toBeDefined();
    expect(result.analysis.failure).toBeDefined();
    expect(result.analysis.forecast).toBeDefined();
    expect(result.analysis.systemHealth).toBeDefined();
    expect(result.analysis.milestones).toBeDefined();
    expect(result.analysis.cycleGovernance?.mode).toBeDefined();
    expect(result.taskBoard).toBeDefined();
    expect(Array.isArray(result.taskBoard.tasks)).toBe(true);
  });
});
