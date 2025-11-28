import { analyzeTeamIdentity, buildUserCapabilityProfile, buildTeamCapabilityProfile } from '../../src/core/team-identity-engine.js';
import { EMPTY_TEAM_STATE } from '../../src/core/team-model.js';

describe('team-identity-engine', () => {
  const stateBase = {
    team: {
      ...EMPTY_TEAM_STATE,
      users: [
        { id: 'user-1', roles: ['individual'], active: true },
        { id: 'user-2', roles: ['individual'], active: true }
      ],
      teams: [{ id: 'team-1', memberIds: ['user-1', 'user-2'], sharedGoalIds: [], active: true }],
      roles: {
        individual: { id: 'individual', capabilityWeights: { 'Execution.discipline': 1 } }
      },
      goalsById: {
        g1: { id: 'g1', ownerUserId: 'user-1', type: 'individual', capabilityId: 'Execution.discipline', targetLevel: 4 },
        g2: { id: 'g2', type: 'shared', teamId: 'team-1', capabilityId: 'Execution.focus', targetLevel: 6 }
      }
    },
    identity: {
      Execution: { discipline: { level: 5 }, focus: { level: 3 } }
    },
    goals: ['goal-placeholder']
  };

  it('builds user capability profile', () => {
    const profile = buildUserCapabilityProfile('user-1', stateBase);
    expect(profile.userId).toBe('user-1');
    expect(profile.capabilities['Execution.discipline'].required).toBeGreaterThan(0);
  });

  it('builds team capability profile with stress', () => {
    const profile = buildTeamCapabilityProfile('team-1', stateBase);
    expect(profile.teamId).toBe('team-1');
    expect(profile.summary.criticalCount + profile.summary.stressedCount + profile.summary.healthyCount).toBeGreaterThanOrEqual(0);
  });

  it('analyzes team identity with defaults', () => {
    const result = analyzeTeamIdentity(stateBase);
    expect(result.users['user-1']).toBeDefined();
    expect(result.teams['team-1']).toBeDefined();
  });

  it('is deterministic and immutable', () => {
    const stateCopy = JSON.parse(JSON.stringify(stateBase));
    const first = analyzeTeamIdentity(stateBase);
    const second = analyzeTeamIdentity(stateBase);
    expect(first).toEqual(second);
    expect(stateBase).toEqual(stateCopy);
  });
});

