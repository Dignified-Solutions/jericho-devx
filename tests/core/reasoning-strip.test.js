import { buildReasoningStrip } from '../../src/core/reasoning-strip.js';

describe('reasoning-strip', () => {
  const state = { goals: ['Ship'], identity: {}, tasks: [] };
  const pipeline = {
    goal: { raw: 'Ship' },
    integrity: { score: 80, completedCount: 2, pendingCount: 1, missedCount: 0 },
    schedule: { todayPriorityTaskId: 't1', overflowTasks: [] },
    analysis: {
      systemHealth: { health: { status: 'green', reasons: ['ok'] } },
      forecast: { goalForecast: { cyclesToTargetOnAverage: 3, onTrack: true, projectedDate: null } },
      cycleGovernance: { mode: 'execute', flags: {}, advisories: [] },
      portfolio: { currentMix: { domains: [] } }
    }
  };
  const narrative = { summary: 'narr' };
  const directives = { directives: [{ id: 'd1', priority: 1, reasonCode: 'R' }], summary: 's' };
  const scene = { panels: [{ id: 'p1', kind: 'gauge' }] };

  it('builds reasoning with required keys', () => {
    const reasoning = buildReasoningStrip({ pipeline, narrative, directives, scene, state });
    expect(reasoning.goalSummary).toBeDefined();
    expect(reasoning.integritySummary.score).toBe(80);
    expect(reasoning.directiveRationale.total).toBe(1);
    expect(reasoning.sceneSummary.panelCount).toBe(1);
    expect(reasoning.systemHealth.status).toBe('green');
  });

  it('is deterministic and immutable', () => {
    const beforeState = JSON.parse(JSON.stringify(state));
    const beforePipeline = JSON.parse(JSON.stringify(pipeline));
    const first = buildReasoningStrip({ pipeline, narrative, directives, scene, state });
    const second = buildReasoningStrip({ pipeline, narrative, directives, scene, state });
    expect(first).toEqual(second);
    expect(state).toEqual(beforeState);
    expect(pipeline).toEqual(beforePipeline);
  });

  it('handles empty structures', () => {
    const reasoning = buildReasoningStrip({ pipeline: {}, narrative: {}, directives: {}, scene: {}, state: {} });
    expect(reasoning.goalSummary.goalsCount).toBe(0);
    expect(reasoning.directiveRationale.total).toBe(0);
  });
});

