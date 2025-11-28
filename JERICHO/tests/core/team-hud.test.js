import { buildTeamHud, buildTeamExport } from '../../src/core/team-hud.js';

const mockSession = {
  team: {
    users: [{ id: 'u1' }],
    teams: [{ id: 'team-1', name: 'Alpha' }],
    goalsById: {
      g1: { id: 'g1', title: 'Ship feature', ownerUserId: 'u1' }
    }
  },
  state: { goals: ['Ship feature'] },
  analysis: {
    pipeline: {
      tasks: [
        { id: 't1', goal: 'g1', status: 'pending' },
        { id: 't2', goal: 'g1', status: 'pending' }
      ]
    },
    teamGovernance: { summary: { teamLoadStatus: 'stable' }, delegation: { t1: 'u1', t2: 'u1' } },
    integrityDeviations: { summary: { teamDeviation: 'healthy' } },
    forecast: { goalForecast: { onTrack: true } }
  },
  tasks: []
};

describe('team-hud', () => {
  it('builds header and duty list deterministically', () => {
    const hud = buildTeamHud(mockSession);
    expect(hud.header.teamName).toBe('Alpha');
    expect(hud.header.memberCount).toBe(1);
    expect(hud.dutyList.length).toBe(1);
    expect(hud.dutyList[0].goalId).toBe('g1');
    expect(hud.dutyList[0].cycleStatus).toBe('on_track');
  });

  it('export shape is stable', () => {
    const exportPayload = buildTeamExport(mockSession);
    expect(exportPayload.team.name).toBe('Alpha');
    expect(Array.isArray(exportPayload.goals)).toBe(true);
    expect(Array.isArray(exportPayload.tasks)).toBe(true);
    expect(exportPayload.governance.mode).toBeDefined();
  });

  it('is deterministic for identical input', () => {
    const a = buildTeamHud(mockSession);
    const b = buildTeamHud(mockSession);
    expect(a).toEqual(b);
  });
});
