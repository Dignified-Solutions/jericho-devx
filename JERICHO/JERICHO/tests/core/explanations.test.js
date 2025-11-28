import { explainReasonCode, explainTaskReasons } from '../../src/core/explanations.js';

describe('explanations', () => {
  it('maps known reason codes', () => {
    expect(explainReasonCode('over_weighted_domain')).toMatch(/represented/);
    expect(explainReasonCode('above_cycle_cap')).toMatch(/cap/);
  });

  it('falls back for unknown codes', () => {
    expect(explainReasonCode('unknown_code')).toBe('Reason: unknown_code');
  });

  it('explains kept and eligible task', () => {
    const task = {
      decision: 'keep',
      governanceEligible: true,
      reasons: ['identity_priority']
    };
    const before = { ...task, reasons: [...task.reasons] };
    const explanation = explainTaskReasons(task);
    expect(explanation.headline).toMatch(/Scheduled/);
    expect(explanation.details[0]).not.toContain('identity_priority');
    expect(task).toEqual(before); // ensure immutability
  });

  it('explains kept but not eligible task', () => {
    const task = {
      decision: 'keep',
      governanceEligible: false,
      reasons: ['above_cycle_cap']
    };
    const explanation = explainTaskReasons(task);
    expect(explanation.headline).toMatch(/inactive/);
    expect(explanation.details[0]).toMatch(/cap/);
  });

  it('explains deferred task', () => {
    const task = {
      decision: 'defer',
      governanceEligible: false,
      reasons: ['deferred_by_compression']
    };
    const explanation = explainTaskReasons(task);
    expect(explanation.headline).toMatch(/Deferred/);
    expect(explanation.details[0]).toMatch(/Deferred/);
  });
});

