import { calculateGap } from '../../src/core/gap-analysis.js';

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
