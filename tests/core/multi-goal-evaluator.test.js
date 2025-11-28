import { evaluateMultiGoalPortfolio } from '../../src/core/multi-goal-evaluator.js';

describe('multi-goal-evaluator', () => {
  const baseSnapshot = {
    state: {
      goals: [{ id: 'g1', raw: 'Goal 1' }, { id: 'g2', raw: 'Goal 2' }]
    },
    analysis: {
      pipeline: {
        goals: [{ id: 'g1', raw: 'Goal 1' }, { id: 'g2', raw: 'Goal 2' }],
        integrity: { score: 80 },
        schedule: { daySlots: [{ slots: [] }], overflowTasks: [] },
        analysis: {
          forecast: { goalForecast: { cyclesToTargetOnAverage: 2, onTrack: true } },
          cycleGovernance: { flags: {} }
        }
      }
    }
  };

  it('classifies single goal as primary', () => {
    const snap = JSON.parse(JSON.stringify(baseSnapshot));
    snap.state.goals = [{ id: 'g1', raw: 'Goal 1' }];
    snap.analysis.pipeline.goals = snap.state.goals;
    const result = evaluateMultiGoalPortfolio(snap);
    expect(result.goals[0].classification).toBeDefined();
    expect(result.portfolio.dominantGoalId).toBe('g1');
    expect(result.portfolio.overcommitted).toBe(false);
  });

  it('detects overcommitment', () => {
    const snap = JSON.parse(JSON.stringify(baseSnapshot));
    snap.state.goals = [
      { id: 'g1', raw: 'Goal 1' },
      { id: 'g2', raw: 'Goal 2' },
      { id: 'g3', raw: 'Goal 3' },
      { id: 'g4', raw: 'Goal 4' }
    ];
    snap.analysis.pipeline.goals = snap.state.goals;
    const result = evaluateMultiGoalPortfolio(snap);
    expect(result.portfolio.overcommitted).toBe(true);
    expect(result.portfolio.conflictNotes).toContain('too_many_primary');
  });

  it('marks critical goal', () => {
    const snap = JSON.parse(JSON.stringify(baseSnapshot));
    snap.analysis.pipeline.integrity = { score: 10 };
    snap.analysis.pipeline.analysis.forecast.goalForecast = {
      cyclesToTargetOnAverage: 5,
      onTrack: false
    };
    const result = evaluateMultiGoalPortfolio(snap);
    expect(result.goals.some((g) => g.classification === 'critical')).toBe(true);
  });

  it('is deterministic and immutable', () => {
    const snap = JSON.parse(JSON.stringify(baseSnapshot));
    const first = evaluateMultiGoalPortfolio(snap);
    const second = evaluateMultiGoalPortfolio(snap);
    expect(first).toEqual(second);
    expect(snap).toEqual(baseSnapshot);
  });
});

