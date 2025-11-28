export const DEFAULT_USER = {
  id: 'user-1',
  name: 'Primary User',
  email: null,
  roles: ['individual'],
  active: true
};

export const DEFAULT_TEAM = {
  id: 'team-1',
  name: 'Default Team',
  memberIds: ['user-1'],
  sharedGoalIds: [],
  active: true
};

export const EMPTY_TEAM_STATE = {
  users: [DEFAULT_USER],
  teams: [DEFAULT_TEAM],
  roles: {},
  goalsById: {},
  teamCycles: {}
};

export function cloneTeam(team = EMPTY_TEAM_STATE) {
  return JSON.parse(JSON.stringify(team));
}

export function normalizeTeam(team) {
  if (!team || typeof team !== 'object') return cloneTeam();
  const merged = {
    users: Array.isArray(team.users) && team.users.length ? team.users : [DEFAULT_USER],
    teams: Array.isArray(team.teams) && team.teams.length ? team.teams : [DEFAULT_TEAM],
    roles: team.roles && typeof team.roles === 'object' ? team.roles : {},
    goalsById: team.goalsById && typeof team.goalsById === 'object' ? team.goalsById : {},
    teamCycles: team.teamCycles && typeof team.teamCycles === 'object' ? team.teamCycles : {}
  };
  return JSON.parse(JSON.stringify(merged));
}

export default { DEFAULT_USER, DEFAULT_TEAM, EMPTY_TEAM_STATE, normalizeTeam, cloneTeam };
