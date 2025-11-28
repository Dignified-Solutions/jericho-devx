import { analyzeIntegrityDeviations } from '../../src/core/integrity-deviation-engine.js';

describe('integrity-deviation-engine', () => {
  it('classifies healthy with stable scores', () => {
    const history = [
      { integrity: { score: 70 } },
      { integrity: { score: 72 } },
      { integrity: { score: 75 } }
    ];
    const current = { score: 76 };
    const result = analyzeIntegrityDeviations(history, current);
    expect(result.capabilities.global.classification).toBe('healthy');
    expect(result.summary.healthyCount).toBe(1);
  });

  it('classifies drifting', () => {
    const history = [
      { integrity: { score: 70 } },
      { integrity: { score: 65 } },
      { integrity: { score: 60 } }
    ];
    const current = { score: 58 };
    const result = analyzeIntegrityDeviations(history, current);
    expect(result.capabilities.global.classification).toBe('drifting');
    expect(result.summary.driftingCount).toBe(1);
  });

  it('classifies regressing', () => {
    const history = [
      { integrity: { score: 70 } },
      { integrity: { score: 55 } },
      { integrity: { score: 40 } }
    ];
    const current = { score: 20 };
    const result = analyzeIntegrityDeviations(history, current);
    expect(result.capabilities.global.classification).toBe('regressing');
    expect(result.summary.regressingCount).toBe(1);
  });

  it('detects high volatility', () => {
    const history = [
      { integrity: { score: 20 } },
      { integrity: { score: 80 } },
      { integrity: { score: 25 } },
      { integrity: { score: 75 } }
    ];
    const current = { score: 50 };
    const result = analyzeIntegrityDeviations(history, current);
    expect(result.summary.highVolatilityCount).toBe(1);
  });

  it('handles insufficient history deterministically', () => {
    const history = [{ integrity: { score: 60 } }];
    const current = { score: 60 };
    const result = analyzeIntegrityDeviations(history, current);
    expect(result.capabilities.global.insufficientHistory).toBe(true);
    expect(result.capabilities.global.baseline).toBe(60);
  });

  it('is deterministic and immutable', () => {
    const history = [
      { integrity: { score: 60 } },
      { integrity: { score: 62 } }
    ];
    const current = { score: 61 };
    const historyCopy = JSON.parse(JSON.stringify(history));
    const currentCopy = JSON.parse(JSON.stringify(current));
    const first = analyzeIntegrityDeviations(history, current);
    const second = analyzeIntegrityDeviations(history, current);
    expect(first).toEqual(second);
    expect(history).toEqual(historyCopy);
    expect(current).toEqual(currentCopy);
  });
});

