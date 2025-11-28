import { buildSessionSnapshot } from '../../src/core/ai-session.js';

describe('ai-session team narrative integration', () => {
  it('passes teamNarrative through snapshot', () => {
    const teamNarrative = { headline: 'team_execute_stable' };
    const pipelineOutput = { analysis: { teamNarrative } };
    const session = buildSessionSnapshot({
      state: { team: {} },
      pipelineOutput,
      scene: {},
      narrative: {},
      directives: { directives: [], summary: '' },
      commandSpec: {},
      reasoning: {},
      chain: {},
      multiGoal: {},
      integrityDeviations: {}
    });

    expect(session.teamNarrative).toEqual(teamNarrative);
    expect(session.analysis.teamNarrative).toEqual(teamNarrative);
  });
});
