import { computeForecast } from '../../src/core/forecast-engine.js';

const goal = {
  id: 'g1',
  outcome: 'I will launch an app',
  deadline: null
};

const requirements = [
  { id: 'r1', domain: 'Execution', capability: 'discipline', targetLevel: 8, weight: 0.5 },
  { id: 'r2', domain: 'Execution', capability: 'consistency', targetLevel: 7, weight: 0.5 }
];

function makeHistoryEntry(ts, score, deltas = []) {
  return {
    timestamp: ts,
    integrity: {
      score,
      completedCount: 0,
      missedCount: 0,
      pendingCount: 0,
      rawTotal: 0,
      maxPossible: 1,
      breakdown: {
        completedOnTime: 0,
        completedLate: 0,
        missed: 0,
        totalTasks: 0,
        completionRate: 0.5,
        onTimeRate: 0.5
      }
    },
    identityBefore: [],
    identityAfter: [],
    changes: deltas.map((delta) => ({
      domain: 'Execution',
      capability: 'discipline',
      beforeLevel: 0,
      afterLevel: 0 + delta,
      delta
    }))
  };
}

describe('forecast-engine', () => {
  it('no history yields neutral forecast', () => {
    const res = computeForecast(goal, requirements, []);
    expect(res.identityTrajectories).toHaveLength(requirements.length);
    res.identityTrajectories.forEach((t) => {
      expect(t.avgDeltaPerCycle).toBe(0);
      expect(t.projectedCyclesToTarget).toBeNull();
      expect(t.projectedDateToTarget).toBeNull();
    });
    expect(res.goalForecast.projectedDate).toBeNull();
    expect(res.goalForecast.cyclesToTargetOnAverage).toBeNull();
    expect(res.volatility.integrityStdDev).toBe(0);
    expect(res.volatility.identityDeltaStdDev).toBe(0);
  });

  it('steady positive progress projects cycles and date', () => {
    const history = [
      makeHistoryEntry('2025-01-01T00:00:00.000Z', 60, [0.5]),
      makeHistoryEntry('2025-01-08T00:00:00.000Z', 65, [0.5]),
      makeHistoryEntry('2025-01-15T00:00:00.000Z', 70, [0.5])
    ];
    const res = computeForecast(goal, requirements, history);
    const traj = res.identityTrajectories.find((t) => t.capability === 'discipline');
    expect(traj.avgDeltaPerCycle).toBeGreaterThan(0);
    expect(traj.projectedCyclesToTarget).toBeGreaterThan(0);
    expect(traj.projectedDateToTarget).toBeTruthy();
  });

  it('already at target yields zero cycles and no date', () => {
    const reqs = [{ id: 'r3', domain: 'Execution', capability: 'consistency', targetLevel: 7, weight: 1 }];
    const history = [
      {
        timestamp: '2025-01-10T00:00:00.000Z',
        integrity: {
          score: 70,
          completedCount: 0,
          missedCount: 0,
          pendingCount: 0,
          rawTotal: 0,
          maxPossible: 1,
          breakdown: { completionRate: 0.8, onTimeRate: 0.8 }
        },
        identityBefore: [],
        identityAfter: [{ domain: 'Execution', capability: 'consistency', level: 7 }],
        changes: []
      }
    ];
    const res = computeForecast(goal, reqs, history);
    expect(res.identityTrajectories[0].projectedCyclesToTarget).toBe(0);
    expect(res.identityTrajectories[0].projectedDateToTarget).toBeNull();
  });

  it('non-positive avg delta yields null projection', () => {
    const history = [
      makeHistoryEntry('2025-01-01T00:00:00.000Z', 60, [-0.2]),
      makeHistoryEntry('2025-01-08T00:00:00.000Z', 55, [0])
    ];
    const res = computeForecast(goal, requirements, history);
    const traj = res.identityTrajectories.find((t) => t.capability === 'discipline');
    expect(traj.projectedCyclesToTarget).toBeNull();
    expect(traj.projectedDateToTarget).toBeNull();
  });

  it('goal onTrack flag respects deadline', () => {
    const history = [
      makeHistoryEntry('2025-01-01T00:00:00.000Z', 60, [0.5]),
      makeHistoryEntry('2025-01-08T00:00:00.000Z', 65, [0.5])
    ];
    const goalWithDeadline = { ...goal, deadline: '2025-03-01T00:00:00.000Z' };
    const res = computeForecast(goalWithDeadline, requirements, history);
    expect(res.goalForecast.onTrack).not.toBeNull();
  });

  it('volatility metrics computed', () => {
    const history = [
      makeHistoryEntry('2025-01-01T00:00:00.000Z', 50, [0.2]),
      makeHistoryEntry('2025-01-08T00:00:00.000Z', 70, [0.5]),
      makeHistoryEntry('2025-01-15T00:00:00.000Z', 90, [0.1])
    ];
    const res = computeForecast(goal, requirements, history);
    expect(res.volatility.integrityStdDev).toBeGreaterThan(0);
    expect(res.volatility.identityDeltaStdDev).toBeGreaterThan(0);
  });

  it('deterministic and input immutability', () => {
    const history = [
      makeHistoryEntry('2025-01-01T00:00:00.000Z', 60, [0.5]),
      makeHistoryEntry('2025-01-08T00:00:00.000Z', 65, [0.5])
    ];
    const goalCopy = JSON.parse(JSON.stringify(goal));
    const reqCopy = JSON.parse(JSON.stringify(requirements));
    const histCopy = JSON.parse(JSON.stringify(history));

    const res1 = computeForecast(goal, requirements, history);
    const res2 = computeForecast(goal, requirements, history);
    expect(res1).toEqual(res2);
    expect(goal).toEqual(goalCopy);
    expect(requirements).toEqual(reqCopy);
    expect(history).toEqual(histCopy);
  });
});
