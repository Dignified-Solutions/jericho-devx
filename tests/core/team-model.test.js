import { DEFAULT_TEAM, DEFAULT_USER, EMPTY_TEAM_STATE, normalizeTeam, cloneTeam } from '../../src/core/team-model.js';

describe('team-model defaults', () => {
  it('has default user and team', () => {
    expect(EMPTY_TEAM_STATE.users[0].id).toBe(DEFAULT_USER.id);
    expect(EMPTY_TEAM_STATE.teams[0].memberIds).toContain(DEFAULT_USER.id);
  });

  it('normalizeTeam falls back to defaults when missing', () => {
    const normalized = normalizeTeam(undefined);
    expect(Array.isArray(normalized.users)).toBe(true);
    expect(normalized.users[0].id).toBe(DEFAULT_USER.id);
    expect(normalized.teams[0].id).toBe(DEFAULT_TEAM.id);
  });

  it('immutability of constants', () => {
    const clone = cloneTeam(EMPTY_TEAM_STATE);
    clone.users[0].id = 'mutated';
    expect(EMPTY_TEAM_STATE.users[0].id).toBe(DEFAULT_USER.id);
  });
});

