import { buildSessionSnapshot } from '../../src/core/ai-session.js';
import commandsSpec from '../../src/ai/commands-spec.json' assert { type: 'json' };

describe('ai-session snapshot', () => {
  it('includes multiGoal and chain', () => {
    const session = buildSessionSnapshot({
      state: {},
      pipelineOutput: {},
      scene: {},
      narrative: {},
      directives: { directives: [], summary: '' },
      commandSpec: commandsSpec,
      reasoning: {},
      chain: { chain: [] },
      multiGoal: { goals: [], portfolio: {} }
    });
    expect(session.analysis.chain).toBeDefined();
    expect(session.analysis.multiGoal).toBeDefined();
  });
});

