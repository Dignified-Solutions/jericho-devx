function mapCycleStatus(onTrack) {
  if (onTrack === true) return 'on_track';
  if (onTrack === false) return 'off_track';
  return 'unknown';
}

function mapIntegrityStatus(session = {}) {
  return (
    session.analysis?.integrityDeviations?.summary?.teamDeviation ||
    session.analysis?.integrityDeviations?.capabilities?.global?.classification ||
    'healthy'
  );
}

function mapGovernanceMode(session = {}) {
  return session.analysis?.teamGovernance?.summary?.teamLoadStatus || 'stable';
}

function selectGoals(session = {}) {
  const teamGoals = session.team?.goalsById
    ? Object.values(session.team.goalsById)
    : [];
  const stateGoals = Array.isArray(session.state?.goals) ? session.state.goals : [];
  if (teamGoals.length) return teamGoals;
  return stateGoals.map((g, idx) => ({ id: `goal-${idx}`, title: g, ownerUserId: session.team?.users?.[0]?.id }));
}

function nextTaskCountForGoal(goalId, tasks = []) {
  if (!goalId) return tasks.length;
  return tasks.filter((t) => t.goalId === goalId || t.goal === goalId).length || tasks.length;
}

export function buildTeamHud(session = {}) {
  const team = session.team || {};
  const users = Array.isArray(team.users) ? team.users : [];
  const goals = selectGoals(session);
  const integrityStatus = mapIntegrityStatus(session);
  const governanceMode = mapGovernanceMode(session);
  const header = {
    teamName: team.teams?.[0]?.name || team.teams?.[0]?.id || 'team-default',
    memberCount: users.length,
    activeGoals: goals.length,
    integrityStatus,
    governanceMode,
    summary: `wm1_${integrityStatus}_${governanceMode}`
  };

  const tasks = session.analysis?.pipeline?.tasks || session.tasks || [];
  const onTrack = session.analysis?.forecast?.goalForecast?.onTrack;
  const dutyList = goals.map((goal, idx) => {
    const goalId = goal.id || `goal-${idx}`;
    const owner =
      goal.ownerUserId ||
      goal.owner ||
      users[0]?.id ||
      'unknown';
    return {
      goalId,
      goalTitle: goal.title || goal.raw || goal.outcome || goal.text || goalId,
      owner,
      cycleStatus: mapCycleStatus(onTrack),
      nextTaskCount: nextTaskCountForGoal(goalId, tasks)
    };
  });

  return {
    header,
    dutyList
  };
}

export function buildTeamExport(session = {}) {
  const teamHud = buildTeamHud(session);
  const tasks = session.analysis?.pipeline?.tasks || session.tasks || [];
  const delegation = session.analysis?.teamGovernance?.delegation || {};
  const exportTasks = tasks.map((t) => ({
    id: t.id,
    owner: delegation[t.id] || null,
    status: t.status || 'pending',
    dueDate: t.dueDate || null
  }));
  const goals = selectGoals(session).map((g, idx) => ({
    id: g.id || `goal-${idx}`,
    title: g.title || g.raw || g.outcome || `goal-${idx}`,
    owner: g.ownerUserId || session.team?.users?.[0]?.id || null,
    status: teamHud.dutyList[idx]?.cycleStatus || 'unknown'
  }));
  return {
    team: {
      name: teamHud.header.teamName,
      members: teamHud.header.memberCount
    },
    goals,
    tasks: exportTasks,
    governance: {
      mode: teamHud.header.governanceMode,
      flags: session.analysis?.teamGovernance?.summary || {}
    },
    integrity: session.analysis?.integrityDeviations?.summary || {},
    reasoning: {
      chainLength: session.analysis?.chain?.chain?.length || 0
    }
  };
}

export default { buildTeamHud, buildTeamExport };
