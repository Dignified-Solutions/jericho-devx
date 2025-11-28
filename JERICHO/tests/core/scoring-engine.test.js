import { scoreIntegrity, scoreTaskPriority } from '../../src/core/scoring-engine.js';

describe('scoreTaskPriority', () => {
  it('ranks higher for severe gaps and critical capabilities', () => {
    const high = scoreTaskPriority(
      { capability: 'deep-work' },
      { gap: 4, targetLevel: 5 }
    );
    const low = scoreTaskPriority(
      { capability: 'planning' },
      { gap: 1, targetLevel: 1 }
    );

    expect(high).toBeGreaterThan(low);
  });
});

describe('scoreIntegrity', () => {
  it('penalizes misses and rewards completions', () => {
    const strong = scoreIntegrity([{ status: 'done' }, { status: 'done' }]);
    const weak = scoreIntegrity([{ status: 'missed' }, { status: 'missed' }]);
    expect(strong).toBeGreaterThan(weak);
  });
});
