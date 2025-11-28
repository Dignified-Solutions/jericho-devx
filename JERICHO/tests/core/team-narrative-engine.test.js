import { compileTeamNarrative } from '../../src/core/team-narrative-engine.js';

describe('team-narrative-engine', () => {
  const team = {
    users: [{ id: 'u1', roles: ['dev'] }, { id: 'u2', roles: ['pm'] }]
  };
  const tasks = [
    { id: 't1', domain: 'Execution' },
    { id: 't2', domain: 'Planning' }
  ];
  const teamGovernance = {
    teamLoad: {
      Execution: { loadIndex: 0.5, status: 'balanced', domain: 'Execution' },
      Planning: { loadIndex: 1.3, status: 'overloaded', domain: 'Planning' }
    },
    delegation: { t1: 'u1', t2: 'u2' },
    summary: { teamLoadStatus: 'overloaded' }
  };

  it('is deterministic for identical inputs', () => {
    const a = compileTeamNarrative({ team, tasks, teamGovernance });
    const b = compileTeamNarrative({ team, tasks, teamGovernance });
    expect(a).toEqual(b);
  });

  it('classifies members and priorities', () => {
    const narrative = compileTeamNarrative({ team, tasks, teamGovernance, goals: [{ id: 'g1' }] });
    expect(narrative.headline).toBeDefined();
    expect(narrative.members.length).toBe(2);
    expect(narrative.priorities.dominantGoalId).toBe('g1');
    expect(narrative.governanceFlags.mode).toBeDefined();
  });

  it('does not mutate inputs', () => {
    const teamCopy = JSON.parse(JSON.stringify(team));
    compileTeamNarrative({ team, tasks, teamGovernance });
    expect(team).toEqual(teamCopy);
  });
});
