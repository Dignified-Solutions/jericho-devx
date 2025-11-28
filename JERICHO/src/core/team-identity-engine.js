import { normalizeTeam, DEFAULT_USER } from './team-model.js';

const GAP_CRITICAL = 3;
const GAP_GROWING = 0;
const ROLE_WEIGHT_DEFAULT = 1;

function collectUserGoals(userId, state) {
  const team = normalizeTeam(state.team);
  const userTeams = team.teams.filter((t) => t.memberIds?.includes(userId)).map((t) => t.id);
  const goalsById = team.goalsById || {};
  return Object.values(goalsById).filter((goal) => {
    if (!goal || typeof goal !== 'object') return false;
    if (goal.ownerUserId === userId) return true;
    if (goal.type === 'shared' && goal.teamId && userTeams.includes(goal.teamId)) return true;
    return false;
  });
}

function computeRequiredCapabilitiesForGoals(goals) {
  const required = {};
  goals.forEach((goal) => {
    const capId = goal.capabilityId;
    const level = Number(goal.targetLevel) || 0;
    if (!capId) return;
    required[capId] = Math.max(required[capId] || 0, level);
  });
  return required;
}

function applyRoleWeights(user, requiredCaps, rolesDef = {}) {
  const weighted = { ...requiredCaps };
  (user.roles || []).forEach((roleId) => {
    const role = rolesDef[roleId];
    if (!role || !role.capabilityWeights) return;
    Object.entries(role.capabilityWeights).forEach(([capId, weight]) => {
      const w = Number(weight) || ROLE_WEIGHT_DEFAULT;
      const currentRequired = weighted[capId] || 0;
      weighted[capId] = Math.max(currentRequired, Math.round(currentRequired * w) || currentRequired);
    });
  });
  return weighted;
}

function fetchCurrentCapabilities(state) {
  const capabilities = {};
  Object.entries(state.identity || {}).forEach(([domain, caps]) => {
    Object.entries(caps || {}).forEach(([cap, val]) => {
      const capId = `${domain}.${cap}`;
      const level = typeof val === 'object' && val !== null ? val.level : val;
      capabilities[capId] = Number(level) || 0;
    });
  });
  return capabilities;
}

function computeGaps(required, current) {
  const result = {};
  const allCaps = new Set([...Object.keys(required), ...Object.keys(current)]);
  allCaps.forEach((capId) => {
    const req = required[capId] || 0;
    const cur = current[capId] || 0;
    const gap = req - cur;
    let status = 'healthy';
    if (gap > GAP_CRITICAL) status = 'critical';
    else if (gap > GAP_GROWING) status = 'growing';
    result[capId] = { required: req, current: cur, gap, status };
  });
  return result;
}

export function buildUserCapabilityProfile(userId, state) {
  const team = normalizeTeam(state.team);
  const user = team.users.find((u) => u.id === userId) || DEFAULT_USER;
  const goals = collectUserGoals(userId, state);
  const required = applyRoleWeights(user, computeRequiredCapabilitiesForGoals(goals), team.roles);
  const current = fetchCurrentCapabilities(state);
  const capabilities = computeGaps(required, current);
  const values = Object.values(capabilities);
  const totalCapabilities = values.length;
  const healthyCount = values.filter((c) => c.status === 'healthy').length;
  const criticalCount = values.filter((c) => c.status === 'critical').length;
  const avgGap = totalCapabilities ? values.reduce((s, c) => s + c.gap, 0) / totalCapabilities : 0;
  const maxGap = totalCapabilities ? Math.max(...values.map((c) => c.gap)) : 0;

  return {
    userId: user.id,
    teamIds: team.teams.filter((t) => t.memberIds?.includes(user.id)).map((t) => t.id),
    roles: user.roles || [],
    capabilities,
    summary: {
      totalCapabilities,
      healthyCount,
      criticalCount,
      avgGap,
      maxGap
    }
  };
}

export function buildTeamCapabilityProfile(teamId, state) {
  const team = normalizeTeam(state.team);
  const teamDef = team.teams.find((t) => t.id === teamId) || team.teams[0];
  const memberIds = teamDef?.memberIds || [];
  const memberProfiles = memberIds.map((uid) => buildUserCapabilityProfile(uid, state));
  const capabilityStress = {};

  memberProfiles.forEach((profile) => {
    Object.entries(profile.capabilities).forEach(([capId, cap]) => {
      const currentEntry = capabilityStress[capId] || {
        requiredMax: 0,
        currentSum: 0,
        memberCount: 0
      };
      currentEntry.requiredMax = Math.max(currentEntry.requiredMax, cap.required);
      currentEntry.currentSum += cap.current;
      currentEntry.memberCount += 1;
      capabilityStress[capId] = currentEntry;
    });
  });

  Object.entries(capabilityStress).forEach(([capId, entry]) => {
    const currentAvg = entry.memberCount ? entry.currentSum / entry.memberCount : 0;
    const gap = entry.requiredMax - currentAvg;
    let status = 'healthy';
    if (gap > GAP_CRITICAL) status = 'critical';
    else if (gap > GAP_GROWING) status = 'stretched';
    capabilityStress[capId] = {
      requiredMax: entry.requiredMax,
      currentSum: entry.currentSum,
      currentAvg,
      gap,
      status
    };
  });

  const stresses = Object.values(capabilityStress);
  const stressedCount = stresses.filter((c) => c.status === 'stretched').length;
  const criticalCount = stresses.filter((c) => c.status === 'critical').length;
  const healthyCount = stresses.filter((c) => c.status === 'healthy').length;
  const dominantGaps = Object.entries(capabilityStress)
    .sort((a, b) => b[1].gap - a[1].gap)
    .slice(0, 3)
    .map(([capId]) => capId);

  return {
    teamId: teamDef?.id || 'team-unknown',
    capabilityStress,
    summary: {
      stressedCount,
      criticalCount,
      healthyCount,
      dominantGaps
    }
  };
}

export function analyzeTeamIdentity(state = {}) {
  const team = normalizeTeam(state.team);
  const users = {};
  const teams = {};

  team.users.forEach((user) => {
    users[user.id] = buildUserCapabilityProfile(user.id, state);
  });

  team.teams.forEach((t) => {
    teams[t.id] = buildTeamCapabilityProfile(t.id, state);
  });

  return { users, teams };
}

export default { buildUserCapabilityProfile, buildTeamCapabilityProfile, analyzeTeamIdentity };
