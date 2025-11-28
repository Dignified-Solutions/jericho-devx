import { DEFAULT_USER, DEFAULT_TEAM, EMPTY_TEAM_STATE, normalizeTeam, cloneTeam } from '../../src/core/team-model.js';

describe('team-model', () => {
  it('defaults include user and team', () => {
    expect(EMPTY_TEAM_STATE.users[0].id).toBe(DEFAULT_USER.id);
    expect(EMPTY_TEAM_STATE.teams[0].memberIds).toContain(DEFAULT_USER.id);
  });

  it('normalizeTeam falls back when missing', () => {
    const normalized = normalizeTeam(undefined);
    expect(Array.isArray(normalized.users)).toBe(true);
    expect(normalized.users[0].id).toBe(DEFAULT_USER.id);
  });

  it('constants are immutable', () => {
    const cloned = cloneTeam(EMPTY_TEAM_STATE);
    cloned.users[0].id = 'mutated';
    expect(EMPTY_TEAM_STATE.users[0].id).toBe(DEFAULT_USER.id);
  });
});

