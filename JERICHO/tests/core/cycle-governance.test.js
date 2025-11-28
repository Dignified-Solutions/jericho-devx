import { evaluateCycleGovernance } from '../../src/core/cycle-governance.js';

const baseHealth = {
  health: { status: 'green', reasons: [] },
  governance: {
    recommendedCycleDays: 7,
    recommendedMaxTasksPerCycle: 10,
    enforceIdentityReset: false,
    enforceGoalReview: false
  }
};

const basePlan = {
  kept: [],
  deferred: [],
  dropped: [],
  summary: {
    keptCount: 6
  }
};

describe('cycle-governance', () => {
  it('healthy execute mode', () => {
    const res = evaluateCycleGovernance({
      goal: {},
      nextCycleIndex: 0,
      systemHealth: baseHealth,
      failureAnalysis: {},
      forecast: {},
      strategicCalendar: {},
      compressedPlan: basePlan,
      portfolioAnalysis: { currentMix: { domains: [] } }
    });
    expect(res.mode).toBe('execute');
    expect(res.severity).toBe('low');
    expect(res.allowedTasks).toBe(basePlan.summary.keptCount);
    expect(res.advisories).toContain('health_green');
    expect(res.advisories).toContain('mode_execute');
  });

  it('conserve due to yellow health', () => {
    const res = evaluateCycleGovernance({
      goal: {},
      nextCycleIndex: 0,
      systemHealth: { ...baseHealth, health: { status: 'yellow' } },
      failureAnalysis: {},
      forecast: {},
      strategicCalendar: {},
      compressedPlan: { ...basePlan, summary: { keptCount: 10 } },
      portfolioAnalysis: { currentMix: { domains: [] } }
    });
    expect(res.mode).toBe('conserve');
    expect(res.severity).toBe('medium');
    expect(res.allowedTasks).toBeLessThan(10);
  });

  it('halt due to red health and high failure', () => {
    const res = evaluateCycleGovernance({
      goal: {},
      nextCycleIndex: 0,
      systemHealth: { ...baseHealth, health: { status: 'red' } },
      failureAnalysis: { lateRate: 0.6 },
      forecast: {},
      strategicCalendar: {},
      compressedPlan: { ...basePlan, summary: { keptCount: 5 } },
      portfolioAnalysis: { currentMix: { domains: [] } }
    });
    expect(res.mode).toBe('halt');
    expect(res.allowedTasks).toBe(0);
    expect(res.flags.highFailureRisk).toBe(true);
  });

  it('reset identity dominates', () => {
    const res = evaluateCycleGovernance({
      goal: {},
      nextCycleIndex: 0,
      systemHealth: { ...baseHealth, governance: { ...baseHealth.governance, enforceIdentityReset: true } },
      failureAnalysis: {},
      forecast: {},
      strategicCalendar: {},
      compressedPlan: { ...basePlan, summary: { keptCount: 5 } },
      portfolioAnalysis: { currentMix: { domains: [] } }
    });
    expect(res.mode).toBe('reset_identity');
    expect(res.allowedTasks).toBeLessThanOrEqual(2);
  });

  it('review goal dominates when enforced', () => {
    const res = evaluateCycleGovernance({
      goal: {},
      nextCycleIndex: 0,
      systemHealth: { ...baseHealth, governance: { ...baseHealth.governance, enforceGoalReview: true } },
      failureAnalysis: {},
      forecast: {},
      strategicCalendar: {},
      compressedPlan: { ...basePlan, summary: { keptCount: 5 } },
      portfolioAnalysis: { currentMix: { domains: [] } }
    });
    expect(res.mode).toBe('review_goal');
    expect(res.allowedTasks).toBeLessThanOrEqual(2);
  });

  it('deadline threat without red health conserves', () => {
    const res = evaluateCycleGovernance({
      goal: { deadlineDays: 20 },
      nextCycleIndex: 0,
      systemHealth: baseHealth,
      failureAnalysis: {},
      forecast: { goalForecast: { onTrack: false } },
      strategicCalendar: {},
      compressedPlan: { ...basePlan, summary: { keptCount: 6 } },
      portfolioAnalysis: { currentMix: { domains: [] } }
    });
    expect(res.flags.deadlineThreat).toBe(true);
    expect(res.mode).toBe('conserve');
  });

  it('portfolio imbalance flagged', () => {
    const res = evaluateCycleGovernance({
      goal: {},
      nextCycleIndex: 0,
      systemHealth: baseHealth,
      failureAnalysis: {},
      forecast: {},
      strategicCalendar: {},
      compressedPlan: basePlan,
      portfolioAnalysis: {
        currentMix: {
          domains: [{ domain: 'Execution', status: 'over', targetWeight: 0.5, actualWeight: 0.7, delta: 0.2 }]
        }
      }
    });
    expect(res.flags.portfolioImbalance).toBe(true);
    expect(res.advisories).toContain('portfolio_imbalanced');
  });

  it('determinism and immutability', () => {
    const inputs = {
      goal: {},
      nextCycleIndex: 1,
      systemHealth: baseHealth,
      failureAnalysis: {},
      forecast: {},
      strategicCalendar: {},
      compressedPlan: basePlan,
      portfolioAnalysis: { currentMix: { domains: [] } }
    };
    const snap = JSON.stringify(inputs);
    const r1 = evaluateCycleGovernance(inputs);
    const r2 = evaluateCycleGovernance(inputs);
    expect(r1).toEqual(r2);
    expect(JSON.stringify(inputs)).toBe(snap);
  });
});
