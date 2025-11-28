import { attachTeamRoles, buildAccountabilityStrip, filterSessionForViewer, ROLE_OWNER, ROLE_CONTRIBUTOR, ROLE_OBSERVER } from '../../src/core/team-roles.js';

const teamState = {
  users: [
    { id: 'u1', name: 'A' },
    { id: 'u2', name: 'B' }
  ],
  goalsById: {
    g1: { id: 'g1', title: 'Goal 1', ownerUserId: 'u1' }
  }
};

const pipelineResult = {
  goal: { id: 'g1', title: 'Goal 1', ownerUserId: 'u1' },
  tasks: [
    { id: 't1', goal: 'g1' },
    { id: 't2', goal: 'g1' }
  ],
  analysis: {
    teamGovernance: { delegation: { t1: 'u1', t2: 'u2' } },
    integrityDeviations: { summary: { teamDeviation: 'healthy' } },
    forecast: { goalForecast: { onTrack: true } }
  }
};

describe('team-roles', () => {
  it('attaches roles deterministically', () => {
    const model = attachTeamRoles(teamState, pipelineResult);
    const u1 = model.members.find((m) => m.memberId === 'u1');
    const u2 = model.members.find((m) => m.memberId === 'u2');
    expect(u1.role).toBe(ROLE_OWNER);
    expect(u2.role).toBe(ROLE_CONTRIBUTOR);
    expect(model.ownershipIndex.g1).toBe('u1');
    expect(model.taskIndex.t1).toBe('u1');
  });

  it('builds accountability strip', () => {
    const model = attachTeamRoles(teamState, pipelineResult);
    const session = { team: teamState, analysis: pipelineResult.analysis };
    const strip = buildAccountabilityStrip(session, model);
    expect(strip.length).toBe(1);
    expect(strip[0].goalId).toBe('g1');
    expect(strip[0].ownerRole).toBe(ROLE_OWNER);
  });

  it('filters session for viewer', () => {
    const model = attachTeamRoles(teamState, pipelineResult);
    const session = { team: teamState, analysis: pipelineResult.analysis };
    const filtered = filterSessionForViewer(session, 'u2', model, 'mine');
    expect(filtered.viewer.memberId).toBe('u2');
    expect(filtered.accountabilityStrip[0].goalId).toBe('g1');
    // ensure no mutation
    expect(teamState.users.length).toBe(2);
  });
});
