import { analyzeAndOptimizePortfolio } from '../../src/core/portfolio-optimizer.js';

const identityRequirements = [
  { id: 'cap1', domain: 'Execution', capability: 'discipline', targetLevel: 8, weight: 0.7 },
  { id: 'cap2', domain: 'Planning', capability: 'time_blocking', targetLevel: 6, weight: 0.3 }
];

const tasksById = {
  t1: { id: 't1', capabilityId: 'cap1', domain: 'Execution', capability: 'discipline', impactWeight: 0.7, difficulty: 2, deadlineCycle: null },
  t2: { id: 't2', capabilityId: 'cap2', domain: 'Planning', capability: 'time_blocking', impactWeight: 0.3, difficulty: 2, deadlineCycle: null },
  t3: { id: 't3', capabilityId: 'cap2', domain: 'Planning', capability: 'time_blocking', impactWeight: 0.1, difficulty: 2, deadlineCycle: null }
};

describe('portfolio-optimizer', () => {
  it('balanced case yields balanced statuses and no recs', () => {
    const compressedPlan = { kept: [{ id: 't1', cycle: 0, action: 'keep', score: 1, reasonCodes: [] }], deferred: [], dropped: [] };
    const result = analyzeAndOptimizePortfolio({
      identityRequirements,
      strategicCalendar: {},
      nextCycleIndex: 0,
      compressedPlan,
      tasksById
    });
    const exec = result.currentMix.domains.find((d) => d.domain === 'Execution');
    const plan = result.currentMix.domains.find((d) => d.domain === 'Planning');
    expect(exec.status === 'balanced' || exec.status === 'over').toBe(true);
    expect(plan.status === 'balanced' || plan.status === 'under').toBe(true);
  });

  it('under-weighted domain produces promotions', () => {
    const compressedPlan = {
      kept: [
        { id: 't1', cycle: 0, action: 'keep', score: 1, reasonCodes: [] },
        { id: 't1b', cycle: 0, action: 'keep', score: 0.9, reasonCodes: [] }
      ],
      deferred: [],
      dropped: []
    };
    const result = analyzeAndOptimizePortfolio({
      identityRequirements,
      strategicCalendar: {},
      nextCycleIndex: 0,
      compressedPlan,
      tasksById
    });
    expect(result.recommendations.promote.length).toBeGreaterThan(0);
    expect(result.recommendations.promote[0].domain).toBe('Planning');
  });

  it('over-weighted domain produces demotions', () => {
    const compressedPlan = {
      kept: [
        { id: 't2', cycle: 0, action: 'keep', score: 0.5, reasonCodes: [] },
        { id: 't3', cycle: 0, action: 'keep', score: 0.4, reasonCodes: [] }
      ],
      deferred: [],
      dropped: []
    };
    const result = analyzeAndOptimizePortfolio({
      identityRequirements,
      strategicCalendar: {},
      nextCycleIndex: 0,
      compressedPlan,
      tasksById
    });
    expect(result.recommendations.demote.length).toBeGreaterThan(0);
    expect(result.recommendations.demote[0].domain).toBe('Planning');
  });

  it('zero activity yields under recommendations', () => {
    const result = analyzeAndOptimizePortfolio({
      identityRequirements,
      strategicCalendar: {},
      nextCycleIndex: 0,
      compressedPlan: { kept: [], deferred: [], dropped: [] },
      tasksById
    });
    expect(result.recommendations.promote.length).toBeGreaterThan(0);
    expect(result.recommendations.demote.length).toBe(0);
  });

  it('determinism and immutability', () => {
    const compressedPlan = { kept: [{ id: 't1', cycle: 0, action: 'keep', score: 1, reasonCodes: [] }], deferred: [], dropped: [] };
    const inputs = {
      identityRequirements,
      strategicCalendar: {},
      nextCycleIndex: 0,
      compressedPlan,
      tasksById
    };
    const snap = JSON.stringify(inputs);
    const r1 = analyzeAndOptimizePortfolio(inputs);
    const r2 = analyzeAndOptimizePortfolio(inputs);
    expect(r1).toEqual(r2);
    expect(JSON.stringify(inputs)).toBe(snap);
  });
});
