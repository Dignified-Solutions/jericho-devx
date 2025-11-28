import evaluateTeamGovernance from '../../src/core/team-governance-engine.js';

describe('team-governance-engine', () => {
  const team = {
    users: [{ id: 'u1' }, { id: 'u2' }]
  };
  const identity = [
    { id: 'cap1', capability: 'discipline', domain: 'Execution', level: 5 },
    { id: 'cap2', capability: 'consistency', domain: 'Execution', level: 6 }
  ];
  const tasks = [
    { id: 't1', domain: 'Execution', capability: 'discipline' },
    { id: 't2', domain: 'Execution', capability: 'consistency' }
  ];

  it('produces deterministic governance summary', () => {
    const result1 = evaluateTeamGovernance(team, [], identity, tasks);
    const result2 = evaluateTeamGovernance(team, [], identity, tasks);
    expect(result1).toEqual(result2);
  });

  it('does not mutate inputs', () => {
    const teamCopy = JSON.parse(JSON.stringify(team));
    const identityCopy = JSON.parse(JSON.stringify(identity));
    evaluateTeamGovernance(team, [], identity, tasks);
    expect(team).toEqual(teamCopy);
    expect(identity).toEqual(identityCopy);
  });

  it('builds delegation map for tasks', () => {
    const result = evaluateTeamGovernance(team, [], identity, tasks);
    expect(Object.keys(result.delegation)).toEqual(['t1', 't2']);
  });
});
