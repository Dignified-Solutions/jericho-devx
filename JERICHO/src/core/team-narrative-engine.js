const LOAD_THRESHOLDS = { under: 0.7, over: 1.2, critical: 1.5 };
const INTEGRITY_THRESHOLDS = { healthy: 0.8, drifting: 0.6, regressing: 0.4 };

function classifyLoad(loadIndex) {
  if (loadIndex == null) return 'balanced';
  if (loadIndex < LOAD_THRESHOLDS.under) return 'underloaded';
  if (loadIndex < LOAD_THRESHOLDS.over) return 'balanced';
  if (loadIndex < LOAD_THRESHOLDS.critical) return 'overloaded';
  return 'critical';
}

function classifyIntegrity(score = 0) {
  if (score >= INTEGRITY_THRESHOLDS.healthy) return 'healthy';
  if (score >= INTEGRITY_THRESHOLDS.drifting) return 'drifting';
  if (score >= INTEGRITY_THRESHOLDS.regressing) return 'regressing';
  return 'collapsing';
}

function computeHeadline(mode, deviationRisk, scheduleRisk) {
  const key = `${mode || 'unknown'}_${deviationRisk || 'unknown'}_${scheduleRisk || 'unknown'}`;
  const map = {
    execute_low_on_track: 'team_execute_stable',
    execute_low_at_risk: 'team_execute_watch',
    execute_medium_at_risk: 'team_execute_guard',
    conserve_high_at_risk: 'team_conserve_defensive',
    conserve_high_off_track: 'team_conserve_off_track',
    triage_high_off_track: 'team_triage_off_track',
    reset_high_off_track: 'team_reset_recover'
  };
  return map[key] || 'team_generic';
}

function computeCycleSummary(mode, deviationRisk, scheduleRisk) {
  return `${mode || 'unknown'}_${deviationRisk || 'unknown'}_${scheduleRisk || 'unknown'}`;
}

function buildMemberBlocks(team = {}, tasks = [], teamGovernance = {}, integrityScores = {}) {
  const members = team.users || [];
  const delegation = teamGovernance.delegation || {};
  const taskByMember = {};
  tasks.forEach((t) => {
    const assignee = delegation[t.id] || null;
    if (!assignee) return;
    if (!taskByMember[assignee]) taskByMember[assignee] = [];
    taskByMember[assignee].push(t.id);
  });

  return members.map((member) => {
    const loadIndex = teamGovernance.teamLoad
      ? Object.values(teamGovernance.teamLoad).reduce((sum, d) => sum + (d.loadIndex ?? 0), 0) /
        (Object.keys(teamGovernance.teamLoad).length || 1)
      : null;
    const loadBand = classifyLoad(loadIndex);
    const integrityBand = classifyIntegrity(integrityScores[member.id]?.score ?? 1);
    let alert = null;
    if (loadBand === 'critical') alert = 'critical_load';
    else if (loadBand === 'overloaded' && integrityBand !== 'healthy') alert = 'overloaded_and_drifting';
    else if (integrityBand === 'regressing' || integrityBand === 'collapsing') alert = 'regressing_identity';

    return {
      memberId: member.id,
      role: Array.isArray(member.roles) && member.roles.length ? member.roles[0] : 'individual',
      primaryGoalId: null,
      loadBand,
      integrityBand,
      keyTasks: taskByMember[member.id] || [],
      alert
    };
  });
}

export function compileTeamNarrative({
  goals = [],
  team = {},
  tasks = [],
  teamGovernance = {},
  sessionMeta = {},
  integrityScores = {}
} = {}) {
  const mode = teamGovernance?.summary?.teamLoadStatus || 'execute';
  const deviationRisk = 'low';
  const scheduleRisk =
    mode === 'critical' || mode === 'overloaded'
      ? 'off_track'
      : teamGovernance?.summary?.teamLoadStatus === 'overloaded'
        ? 'at_risk'
        : 'on_track';

  const headline = computeHeadline(mode, deviationRisk, scheduleRisk);
  const cycleSummary = computeCycleSummary(mode, deviationRisk, scheduleRisk);

  const members = buildMemberBlocks(team, tasks, teamGovernance, integrityScores);
  const capabilities = Object.values(teamGovernance.teamLoad || {}).sort(
    (a, b) => (b.loadIndex ?? 0) - (a.loadIndex ?? 0)
  );
  const focusDomains = capabilities.filter((c) => c.status === 'critical' || c.status === 'overloaded').map((c) => c.domain || 'unknown');
  const blockedDomains = capabilities.filter((c) => c.status === 'critical').map((c) => c.domain || 'unknown');

  const priorities = {
    dominantGoalId: Array.isArray(goals) && goals.length ? goals[0]?.id || null : null,
    focusDomains,
    blockedDomains
  };

  const governanceFlags = {
    mode: mode === 'critical' ? 'triage' : mode === 'overloaded' ? 'conserve' : 'execute',
    deviationRisk,
    scheduleRisk
  };

  return {
    headline,
    cycleSummary,
    members,
    priorities,
    governanceFlags
  };
}

export default compileTeamNarrative;
