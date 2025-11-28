import { buildSessionSnapshot } from '../../src/core/ai-session.js';
import { EMPTY_TEAM_STATE } from '../../src/core/team-model.js';

describe('ai-session snapshot', () => {
  it('includes team block with defaults', () => {
    const session = buildSessionSnapshot({
      state: { team: EMPTY_TEAM_STATE },
      pipelineOutput: {},
      scene: {},
      narrative: {},
      directives: { directives: [], summary: '' },
      commandSpec: {},
      reasoning: {},
      chain: { chain: [] },
      multiGoal: {},
      integrityDeviations: {}
    });
    expect(session.team).toBeDefined();
    expect(Array.isArray(session.team.users)).toBe(true);
    expect(Array.isArray(session.team.teams)).toBe(true);
    expect(typeof session.team.goalsById).toBe('object');
    expect(typeof session.team.roles).toBe('object');
    expect(session.analysis.teamIdentity).toBeNull();
    expect(session.teamIdentity).toBeNull();
    expect(session.teamGovernance).toBeNull();
    expect(session.analysis.teamGovernance).toBeNull();
    expect(session.teamRoles).toBeDefined();
    expect(session.accountabilityStrip).toBeDefined();
  });
});
