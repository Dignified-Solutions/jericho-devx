import { decomposeGoal } from '../../src/core/goal-decomposition.js';

const goalBase = {
  id: 'g1',
  outcome: 'I will launch an app',
  outcomeMetric: null,
  deadline: null,
  deadlineDays: null,
  type: 'project'
};

const reqs = [
  { id: 'r1', domain: 'Execution', capability: 'discipline', targetLevel: 8, weight: 0.4 },
  { id: 'r2', domain: 'Execution', capability: 'consistency', targetLevel: 7, weight: 0.3 },
  { id: 'r3', domain: 'Planning', capability: 'time_blocking', targetLevel: 6, weight: 0.2 },
  { id: 'r4', domain: 'Output', capability: 'shipping_frequency', targetLevel: 8, weight: 0.5 },
  { id: 'r5', domain: 'Learning', capability: 'study_hours', targetLevel: 7, weight: 0.3 }
];

describe('goal-decomposition', () => {
  it('basic decomposition with forecast present', () => {
    const forecast = { goalForecast: { cyclesToTargetOnAverage: 6 } };
    const result = decomposeGoal(goalBase, reqs, forecast);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.length).toBeLessThanOrEqual(5);
    result.forEach((m) => expect(m.cycleStart).toBeLessThanOrEqual(m.cycleEnd));
    const allReqIds = result.flatMap((m) => m.requiredCapabilities.map((c) => c.requirementId));
    expect(new Set(allReqIds).size).toBe(reqs.length);
  });

  it('deadline-based decomposition without forecast', () => {
    const goal = { ...goalBase, deadlineDays: 60 };
    const result = decomposeGoal(goal, reqs, null);
    expect(result.length).toBeGreaterThanOrEqual(2);
    const cyclesBudget = Math.max(result.length, Math.round(goal.deadlineDays / 7));
    expect(result[result.length - 1].cycleEnd).toBe(cyclesBudget - 1);
  });

  it('default decomposition without forecast or deadline', () => {
    const result = decomposeGoal(goalBase, reqs, null);
    expect(result.length).toBe(3);
    expect(result[result.length - 1].cycleEnd).toBe(result.length * 2 - 1);
  });

  it('intensity assignment reflects density', () => {
    const requirements = [
      { id: 'a', domain: 'Execution', capability: 'a', targetLevel: 8, weight: 0.5 },
      { id: 'b', domain: 'Execution', capability: 'b', targetLevel: 7, weight: 0.4 },
      { id: 'c', domain: 'Execution', capability: 'c', targetLevel: 6, weight: 0.3 },
      { id: 'd', domain: 'Execution', capability: 'd', targetLevel: 5, weight: 0.2 }
    ];
    const forecast = { goalForecast: { cyclesToTargetOnAverage: 4 } };
    const result = decomposeGoal(goalBase, requirements, forecast);
    const densePhase = result.find((p) => p.requiredCapabilities.length >= 2);
    const sparsePhase = result.find((p) => p.requiredCapabilities.length === 1) || result[0];
    expect(densePhase.intensity === 'high' || densePhase.intensity === 'medium').toBe(true);
    expect(sparsePhase.intensity === 'low' || sparsePhase.intensity === 'medium').toBe(true);
  });

  it('determinism and immutability', () => {
    const goalCopy = JSON.parse(JSON.stringify(goalBase));
    const reqCopy = JSON.parse(JSON.stringify(reqs));
    const forecast = { goalForecast: { cyclesToTargetOnAverage: 6 } };
    const first = decomposeGoal(goalBase, reqs, forecast);
    const second = decomposeGoal(goalBase, reqs, forecast);
    expect(first).toEqual(second);
    expect(goalBase).toEqual(goalCopy);
    expect(reqs).toEqual(reqCopy);
  });
});
