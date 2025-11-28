import {
  calculateGap,
  computeCapabilityGaps,
  rankCapabilityGaps
} from '../../src/core/gap-analysis.js';

describe('calculateGap', () => {
  it('orders gaps by severity and target', () => {
    const gaps = calculateGap([
      { domain: 'focus', capability: 'deep-work', targetLevel: 5, currentLevel: 2 },
      { domain: 'health', capability: 'daily-movement', targetLevel: 4, currentLevel: 3 }
    ]);

    expect(gaps[0].capability).toBe('deep-work');
    expect(gaps[0].gap).toBe(3);
    expect(gaps[1].gap).toBe(1);
  });

  it('respects missing current level as zero', () => {
    const gaps = calculateGap([{ domain: 'focus', capability: 'flow', targetLevel: 3 }]);
    expect(gaps[0].gap).toBe(3);
  });
});

describe('computeCapabilityGaps + rankCapabilityGaps', () => {
  const requirements = [
    { id: 'r1', domain: 'Execution', capability: 'discipline', targetLevel: 8, weight: 0.5 },
    { id: 'r2', domain: 'Execution', capability: 'consistency', targetLevel: 7, weight: 0.3 },
    { id: 'r3', domain: 'Planning', capability: 'time_blocking', targetLevel: 6, weight: 0.2 }
  ];

  it('matches identity levels and computes gaps', () => {
    const identity = [
      { id: 'i1', domain: 'Execution', capability: 'discipline', level: 6 },
      { id: 'i2', domain: 'Execution', capability: 'consistency', level: 4 }
    ];
    const gaps = computeCapabilityGaps(identity, requirements);
    const disc = gaps.find((g) => g.capability === 'discipline');
    expect(disc.currentLevel).toBe(6);
    expect(disc.rawGap).toBe(2);
    expect(disc.weightedGap).toBeCloseTo(1);
  });

  it('defaults missing identity to level 3', () => {
    const gaps = computeCapabilityGaps([], requirements);
    const missing = gaps.find((g) => g.capability === 'time_blocking');
    expect(missing.currentLevel).toBe(3);
    expect(missing.rawGap).toBe(3);
  });

  it('clamps negative gaps to zero', () => {
    const identity = [{ id: 'i1', domain: 'Execution', capability: 'discipline', level: 10 }];
    const gaps = computeCapabilityGaps(identity, requirements);
    const disc = gaps.find((g) => g.capability === 'discipline');
    expect(disc.rawGap).toBe(0);
    expect(disc.weightedGap).toBe(0);
  });

  it('ranks by weighted gap descending with ranks starting at 1', () => {
    const identity = [{ id: 'i1', domain: 'Execution', capability: 'discipline', level: 6 }];
    const gaps = computeCapabilityGaps(identity, requirements);
    const ranked = rankCapabilityGaps(gaps);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].weightedGap).toBeGreaterThanOrEqual(ranked[1].weightedGap);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(3);
  });

  it('ensures bounds and non-negative gaps', () => {
    const gaps = computeCapabilityGaps([], requirements);
    gaps.forEach((gap) => {
      expect(gap.currentLevel).toBeGreaterThanOrEqual(1);
      expect(gap.currentLevel).toBeLessThanOrEqual(10);
      expect(gap.rawGap).toBeGreaterThanOrEqual(0);
      expect(gap.weightedGap).toBeGreaterThanOrEqual(0);
    });
  });
});
