import { buildReasoningChain } from '../../src/core/reasoning-chain.js';

describe('reasoning-chain', () => {
  const pipeline = {
    gaps: [{}, {}],
    schedule: { overflowTasks: [1], todayPriorityTaskId: 't1' },
    analysis: {
      cycleGovernance: { mode: 'execute', flags: { a: true } },
      forecast: { goalForecast: { cyclesToTargetOnAverage: 3 } }
    }
  };
  const directives = { directives: [{ id: 'd1', priority: 1, reasonCode: 'TODAY_PRIORITY_TASK' }] };

  it('builds deterministic chain', () => {
    const chain = buildReasoningChain({ pipeline, directives }).chain;
    expect(chain.length).toBeGreaterThan(0);
    expect(chain[0].scope).toBe('identity');
    expect(chain[chain.length - 1].scope).toBe('directives');
  });

  it('is deterministic and immutable', () => {
    const pipeCopy = JSON.parse(JSON.stringify(pipeline));
    const dirCopy = JSON.parse(JSON.stringify(directives));
    const first = buildReasoningChain({ pipeline, directives });
    const second = buildReasoningChain({ pipeline, directives });
    expect(first).toEqual(second);
    expect(pipeline).toEqual(pipeCopy);
    expect(directives).toEqual(dirCopy);
  });
});

