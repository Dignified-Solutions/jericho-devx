import { validateGoal } from '../../src/core/validate-goal.js';

describe('validateGoal', () => {
  it('accepts valid binary completion with ISO deadline', () => {
    const res = validateGoal('I will finish the project by 2025-01-01');
    expect(res.valid).toBe(true);
    expect(res.goal.type).toBe('event');
    expect(res.goal.deadline.startsWith('2025-01-01')).toBe(true);
  });

  it('accepts numeric production goal', () => {
    const res = validateGoal('I will ship 10 features by 2025-06-30');
    expect(res.valid).toBe(true);
    expect(res.goal.type).toBe('production');
    expect(res.goal.metric).toBe('10');
  });

  it('rejects missing by keyword', () => {
    const res = validateGoal('I will finish the project');
    expect(res.valid).toBe(false);
    expect(res.error).toBe('missing_by_keyword');
  });

  it('rejects vague outcome', () => {
    const res = validateGoal('I will improve my health by 2025-01-01');
    expect(res.valid).toBe(false);
    expect(res.error).toBe('vague_outcome');
  });

  it('rejects ambiguous deadline', () => {
    const res = validateGoal('I will finish the project by next week');
    expect(res.valid).toBe(false);
    expect(res.error).toBe('ambiguous_deadline');
  });

  it('rejects compound goals with and', () => {
    const res = validateGoal('I will finish and deploy the project by 2025-01-01');
    expect(res.valid).toBe(false);
    expect(res.error).toBe('compound_goal');
  });

  it('rejects wrong format without I will', () => {
    const res = validateGoal('Finish the project by 2025-01-01');
    expect(res.valid).toBe(false);
    expect(res.error).toBe('invalid_outcome');
  });

  it('rejects non-future phrasing', () => {
    const res = validateGoal('I finished the project by 2025-01-01');
    expect(res.valid).toBe(false);
    expect(res.error).toBe('invalid_outcome');
  });
});
