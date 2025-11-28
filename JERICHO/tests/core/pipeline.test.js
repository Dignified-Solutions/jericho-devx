import { jest } from '@jest/globals';
import { runPipeline } from '../../src/core/pipeline.js';

describe('runPipeline', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('handles valid goal and returns derived artifacts', () => {
    const goalInput = { goals: ['I will launch an app by 2026-03-01'] };
    const identity = {
      Execution: { discipline: { level: 5 }, consistency: { level: 4 } },
      Planning: { time_blocking: { level: 3 } }
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

    expect(result.goal).not.toBeNull();
    expect(result.requirements.length).toBeGreaterThan(0);
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.rankedGaps.length).toBeGreaterThan(0);
    expect(result.tasks.length).toBeGreaterThan(0);
    expect(result.tasks.length).toBeLessThanOrEqual(5);
    expect(result.history.length).toBe(1);
    expect(result.identityAfter.find((i) => i.capability === 'discipline')?.level).toBeGreaterThan(
      result.identityBefore.find((i) => i.capability === 'discipline')?.level || 0
    );
    expect(result.schedule).toBeDefined();
    expect(result.schedule.daySlots.length).toBeGreaterThan(0);
    expect(Array.isArray(result.schedule.daySlots[0].slots)).toBe(true);
    expect(result.schedule.cycleStart).toBeTruthy();
    expect(result.schedule.cycleEnd).toBeTruthy();
    const allScheduledIds = result.schedule.daySlots
      .flatMap((d) => d.slots)
      .flatMap((s) => s.taskIds);
    const combined = new Set([...allScheduledIds, ...(result.schedule.overflowTasks || [])]);
    expect(result.tasks.some((t) => combined.has(t.id))).toBe(true);
    expect(result.analysis).toBeDefined();
    expect(result.analysis.failure).toBeDefined();
    expect(result.analysis.forecast).toBeDefined();
    expect(result.analysis.systemHealth).toBeDefined();
    expect(result.analysis.milestones).toBeInstanceOf(Array);
    expect(result.analysis.strategicCalendar?.cycles?.length).toBeGreaterThan(0);
    expect(result.analysis.compressedPlan?.summary).toBeDefined();
    expect(result.analysis.portfolio?.currentMix?.domains).toBeDefined();
    expect(result.analysis.cycleGovernance?.mode).toBeDefined();
    expect(result.analysis.teamIdentity).toBeDefined();
    expect(result.taskBoard).toBeDefined();
    expect(Array.isArray(result.taskBoard.tasks)).toBe(true);
    expect(result.taskBoard.tasks.length).toBe(result.tasks.length);
    expect(result.taskBoard.summary.allowedTasks).toBe(result.analysis.cycleGovernance.allowedTasks);
    expect(result.taskBoard.summary.keptCount).toBe(result.analysis.compressedPlan.kept.length);
    if (typeof result.taskBoard.summary.allowedTasks === 'number') {
      expect(result.taskBoard.summary.eligibleCount).toBeLessThanOrEqual(
        result.taskBoard.summary.allowedTasks
      );
    }
  });

  it('handles invalid goal', () => {
    const history = [{ timestamp: 'old' }];
    const result = runPipeline({ goals: ['invalid goal without keyword'] }, {}, history, []);
    expect(result.goal).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.requirements).toHaveLength(0);
    expect(result.gaps).toHaveLength(0);
    expect(result.tasks).toHaveLength(0);
    expect(result.history).toBe(history);
  });

  it('defaults missing identity levels', () => {
    const goalInput = { goals: ['I will pass an exam by 2026-05-01'] };
    const result = runPipeline(goalInput, {}, [], []);
    expect(result.gaps.length).toBeGreaterThan(0);
  });

  it('is deterministic with fixed time', () => {
    const goalInput = { goals: ['I will launch an app by 2026-03-01'] };
    const identity = {
      Execution: { discipline: { level: 5 }, consistency: { level: 4 } }
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
    const first = runPipeline(goalInput, identity, [], tasks);
    const second = runPipeline(goalInput, identity, [], tasks);
    expect(first.tasks.length).toBe(second.tasks.length);
    expect(first.goal.outcome).toBe(second.goal.outcome);
    expect(first.requirements.length).toBe(second.requirements.length);
    expect(first.schedule.daySlots.length).toBe(second.schedule.daySlots.length);
    expect(first.schedule.overflowTasks.length).toBe(second.schedule.overflowTasks.length);
    expect(first.schedule.todayPriorityTaskId).toBeTruthy();
    expect(first.analysis.systemHealth.health.status).toBe(second.analysis.systemHealth.health.status);
    expect(first.analysis.failure.summary?.recentCycles).toBe(second.analysis.failure.summary?.recentCycles);
    expect(first.analysis.forecast.goalForecast?.onTrack).toBe(second.analysis.forecast.goalForecast?.onTrack);
    expect(first.analysis.milestones.length).toBe(second.analysis.milestones.length);
    expect(first.taskBoard).toBeDefined();
    expect(first.taskBoard.tasks.length).toBe(second.taskBoard.tasks.length);
    expect(first.taskBoard.tasks[0].explanations).toBeDefined();
    expect(first.taskBoard.summary.keptCount).toBe(second.taskBoard.summary.keptCount);
    expect(first.taskBoard.summary.allowedTasks).toBe(second.taskBoard.summary.allowedTasks);
  });
});
