import { evaluateIntegrity } from '../../src/services/integrity-service.js';

describe('evaluateIntegrity', () => {
  it('classifies risk bands', () => {
    const low = evaluateIntegrity({ history: [{ status: 'missed' }, { status: 'missed' }] });
    expect(low.risk).toBe('critical');

    const high = evaluateIntegrity({ history: [{ status: 'done' }, { status: 'done' }] });
    expect(high.risk).toBe('stable');
  });
});
