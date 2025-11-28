import { compileNarrative } from '../../src/core/narrative-compiler.js';

describe('narrative-compiler', () => {
  const state = {
    goals: ['Ship app by date'],
    identity: { Execution: { discipline: { level: 5 } } },
    tasks: [],
    history: []
  };

  const pipelineOutput = {
    goal: { raw: 'Ship app by date' },
    requirements: [{ domain: 'Execution', capability: 'discipline' }],
    gaps: [{ domain: 'Execution', capability: 'discipline' }],
    integrity: { score: 80 },
    taskBoard: { tasks: [], summary: {} },
    schedule: { daySlots: [{ slots: [] }], overflowTasks: [] },
    analysis: {
      forecast: { goalForecast: { cyclesToTargetOnAverage: 3, onTrack: true } },
      systemHealth: { health: { status: 'green', reasons: [] } },
      cycleGovernance: { mode: 'execute', advisories: [], flags: {} }
    }
  };

  it('builds deterministic narrative', () => {
    const narrative = compileNarrative(state, pipelineOutput);
    expect(narrative.identityNarrative.length).toBeGreaterThan(0);
    expect(narrative.goalNarrative[0]).toContain('Goals stored');
    expect(narrative.summary).toContain('Mode=');
  });

  it('is deterministic and immutable', () => {
    const beforeState = JSON.parse(JSON.stringify(state));
    const beforePipeline = JSON.parse(JSON.stringify(pipelineOutput));
    const first = compileNarrative(state, pipelineOutput);
    const second = compileNarrative(state, pipelineOutput);
    expect(first).toEqual(second);
    expect(state).toEqual(beforeState);
    expect(pipelineOutput).toEqual(beforePipeline);
  });
});

