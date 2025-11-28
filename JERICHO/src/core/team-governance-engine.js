const LOAD_THRESHOLDS = {
  underloaded: 0.4,
  stable: 0.7,
  overloaded: 1.0
};

function aggregateTeamCapabilities(teamState, identity) {
  const strength = {};
  const members = teamState?.users || [];
  const identityArray = Array.isArray(identity) ? identity : Object.values(identity || {});

  members.forEach(() => {
    identityArray.forEach((entry) => {
      if (!entry || !entry.capability) return;
      const key = entry.capability;
      strength[key] = (strength[key] || 0) + (Number(entry.level) || 0);
    });
  });

  return strength;
}

function computeTeamLoad(teamState, tasks, capabilityStrength) {
  const domains = {};
  (tasks || []).forEach((task) => {
    const domain = task.domain || 'unknown';
    domains[domain] = domains[domain] || { demand: 0, strength: 0, status: 'stable' };
    domains[domain].demand += 1;
  });

  Object.keys(domains).forEach((domain) => {
    const available = Object.values(capabilityStrength).reduce((sum, lvl) => sum + lvl, 0) || 1;
    const ratio = domains[domain].demand / available;
    let status = 'stable';
    if (ratio < LOAD_THRESHOLDS.underloaded) status = 'underloaded';
    else if (ratio < LOAD_THRESHOLDS.stable) status = 'stable';
    else if (ratio < LOAD_THRESHOLDS.overloaded) status = 'overloaded';
    else status = 'critical';
    domains[domain].strength = available;
    domains[domain].status = status;
    domains[domain].loadIndex = ratio;
  });

  return domains;
}

function buildDelegationMatrix(teamState, tasks, capabilityStrength) {
  const members = teamState?.users || [];
  const sortedMembers = [...members].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  const delegation = {};

  (tasks || []).forEach((task) => {
    const bestMember = sortedMembers[0]?.id || null;
    delegation[task.id] = bestMember;
  });

  return delegation;
}

export function evaluateTeamGovernance(teamState = {}, goals = [], identity = {}, tasks = []) {
  const safeTeam = teamState || {};
  const capabilityStrength = aggregateTeamCapabilities(safeTeam, identity);
  const teamLoad = computeTeamLoad(safeTeam, tasks, capabilityStrength);
  const delegation = buildDelegationMatrix(safeTeam, tasks, capabilityStrength);

  const summary = {
    teamHealth: 'stable',
    teamFailureRisk: 'low',
    teamIntegrityDrift: 'stable',
    teamRoleConflicts: [],
    teamPriorityDirectives: [],
    teamLoadStatus: Object.values(teamLoad).some((d) => d.status === 'critical')
      ? 'critical'
      : Object.values(teamLoad).some((d) => d.status === 'overloaded')
        ? 'overloaded'
        : 'stable'
  };

  return {
    capabilityStrength,
    teamLoad,
    delegation,
    summary
  };
}

export default evaluateTeamGovernance;
