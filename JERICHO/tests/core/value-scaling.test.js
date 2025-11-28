import { updateCapabilityWeights } from '../../src/core/value-scaling.js';

const reqs = [
  { id: 'r1', domain: 'Execution', capability: 'discipline', targetLevel: 8, weight: 0.4 },
  { id: 'r2', domain: 'Execution', capability: 'consistency', targetLevel: 7, weight: 0.3 },
  { id: 'r3', domain: 'Planning', capability: 'time_blocking', targetLevel: 6, weight: 0.3 }
];

describe('value-scaling', () => {
  it('no history leaves weights normalized', () => {
    const original = JSON.parse(JSON.stringify(reqs));
    const updated = updateCapabilityWeights(reqs, []);
    const sum = updated.reduce((acc, r) => acc + r.weight, 0);
    expect(sum).toBeGreaterThan(0.99);
    expect(sum).toBeLessThan(1.01);
    const beforeOrder = original
      .map((r, idx) => ({ cap: r.capability, w: r.weight, idx }))
      .sort((a, b) => b.w - a.w || a.idx - b.idx);
    const afterOrder = updated
      .map((r, idx) => ({ cap: r.capability, w: r.weight, idx }))
      .sort((a, b) => b.w - a.w || a.idx - b.idx);
    expect(beforeOrder.map((o) => o.cap)).toEqual(afterOrder.map((o) => o.cap));
  });

  it('positive progress with high integrity increases weight', () => {
    const history = [
      {
        integrity: { score: 80 },
        changes: [
          { domain: 'Execution', capability: 'discipline', delta: 0.5 },
          { domain: 'Execution', capability: 'discipline', delta: 0.5 }
        ]
      }
    ];
    const updated = updateCapabilityWeights(reqs, history);
    const discipline = updated.find((r) => r.capability === 'discipline');
    const consistency = updated.find((r) => r.capability === 'consistency');
    expect(discipline.weight).toBeGreaterThan(0.4);
    expect(discipline.weight).toBeGreaterThan(consistency.weight);
  });

  it('untouched capability gets reduced relative to active one', () => {
    const history = [
      {
        integrity: { score: 75 },
        changes: [{ domain: 'Execution', capability: 'discipline', delta: 0.4 }]
      }
    ];
    const updated = updateCapabilityWeights(reqs, history);
    const discipline = updated.find((r) => r.capability === 'discipline');
    const timeBlocking = updated.find((r) => r.capability === 'time_blocking');
    expect(timeBlocking.weight).toBeLessThan(reqs.find((r) => r.capability === 'time_blocking').weight);
    expect(discipline.weight).toBeGreaterThan(timeBlocking.weight);
  });

  it('regression increases emphasis but remains bounded', () => {
    const history = [
      {
        integrity: { score: 60 },
        changes: [{ domain: 'Execution', capability: 'consistency', delta: -0.3 }]
      }
    ];
    const updated = updateCapabilityWeights(reqs, history);
    const consistency = updated.find((r) => r.capability === 'consistency');
    expect(consistency.weight).toBeGreaterThan(reqs.find((r) => r.capability === 'consistency').weight);
    expect(consistency.weight).toBeLessThanOrEqual(1);
  });

  it('weights normalized and bounded', () => {
    const history = [
      {
        integrity: { score: 80 },
        changes: [
          { domain: 'Execution', capability: 'discipline', delta: 0.5 },
          { domain: 'Execution', capability: 'consistency', delta: 0.1 }
        ]
      }
    ];
    const updated = updateCapabilityWeights(reqs, history);
    const sum = updated.reduce((acc, r) => acc + r.weight, 0);
    expect(sum).toBeGreaterThan(0.99);
    expect(sum).toBeLessThan(1.01);
    updated.forEach((r) => {
      expect(r.weight).toBeGreaterThanOrEqual(0.05);
      expect(r.weight).toBeLessThanOrEqual(1);
    });
  });

  it('immutability', () => {
    const original = JSON.stringify(reqs);
    updateCapabilityWeights(reqs, []);
    expect(JSON.stringify(reqs)).toBe(original);
  });
});
