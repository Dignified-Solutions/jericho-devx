import { analyzeFailurePatterns } from '../../src/core/failure-engine.js';

function makeCycle(score, completionRate, onTimeRate, changes = [], breakdownExtras = {}) {
  return {
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
        completionRate,
        onTimeRate,
        ...breakdownExtras
      }
    },
    changes
  };
}

describe('failure-engine', () => {
  it('benign defaults with no history', () => {
    const integrity = {
      score: 0,
      completedCount: 0,
      missedCount: 0,
      pendingCount: 0,
      rawTotal: 0,
      maxPossible: 0,
      breakdown: { completionRate: 0, onTimeRate: 0 }
    };
    const result = analyzeFailurePatterns([], integrity);
    expect(result.summary.recentCycles).toBe(1);
    expect(result.summary.trend).toBe('unknown');
    expect(result.failureProfile.highMissRate).toBe(false);
    expect(result.recommendations.throughputAdjustment).toBe('hold');
    expect(result.recommendations.throughputFactor).toBe(1);
  });

  it('chronic low integrity and high miss decreases throughput', () => {
    const history = [
      makeCycle(35, 0.4, 0.3),
      makeCycle(32, 0.35, 0.2),
      makeCycle(34, 0.4, 0.25)
    ];
    const result = analyzeFailurePatterns(history, history[2].integrity);
    expect(result.failureProfile.chronicLowIntegrity).toBe(true);
    expect(result.failureProfile.highMissRate).toBe(true);
    expect(result.recommendations.throughputAdjustment).toBe('decrease');
    expect(result.recommendations.throughputFactor).toBeLessThan(1);
    expect(result.recommendations.enforceCatchUpCycle).toBe(true);
  });

  it('improving trend with high completion increases throughput', () => {
    const history = [
      makeCycle(60, 0.9, 0.8),
      makeCycle(75, 0.9, 0.85),
      makeCycle(85, 0.9, 0.9)
    ];
    const result = analyzeFailurePatterns(history, history[2].integrity);
    expect(result.summary.trend).toBe('improving');
    expect(result.recommendations.throughputAdjustment).toBe('increase');
    expect(result.recommendations.throughputFactor).toBeGreaterThan(1);
  });

  it('high late rate flagged even if completion ok', () => {
    const history = [
      makeCycle(70, 0.8, 0.3, [], { completedOnTime: 1, completedLate: 4 }),
      makeCycle(72, 0.82, 0.2, [], { completedOnTime: 1, completedLate: 4 })
    ];
    const result = analyzeFailurePatterns(history, history[1].integrity);
    expect(result.failureProfile.highLateRate).toBe(true);
  });

  it('regression flags capability', () => {
    const history = [
      makeCycle(60, 0.7, 0.7, [{ domain: 'Execution', capability: 'discipline', delta: -0.3 }]),
      makeCycle(62, 0.7, 0.7, [{ domain: 'Execution', capability: 'discipline', delta: -0.25 }])
    ];
    const result = analyzeFailurePatterns(history, history[1].integrity);
    expect(result.recommendations.flaggedCapabilities).toEqual([
      { domain: 'Execution', capability: 'discipline', reason: 'regression' }
    ]);
  });

  it('deterministic and immutable', () => {
    const history = [
      makeCycle(60, 0.7, 0.6, [{ domain: 'Execution', capability: 'consistency', delta: 0.05 }])
    ];
    const before = JSON.stringify(history);
    const res1 = analyzeFailurePatterns(history, history[0].integrity);
    const res2 = analyzeFailurePatterns(history, history[0].integrity);
    expect(res1).toEqual(res2);
    expect(JSON.stringify(history)).toBe(before);
  });
});
