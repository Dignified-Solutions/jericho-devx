export const ROLE_OWNER = 'OWNER';
export const ROLE_CONTRIBUTOR = 'CONTRIBUTOR';
export const ROLE_OBSERVER = 'OBSERVER';

function pickUsers(teamState = {}) {
  return Array.isArray(teamState.users) ? teamState.users : [];
}

function pickGoals(teamState = {}, pipelineResult = {}) {
  const teamGoals = teamState.goalsById ? Object.values(teamState.goalsById) : [];
  if (teamGoals.length) return teamGoals;
  const pipelineGoal = pipelineResult.goal;
  if (pipelineGoal) return [pipelineGoal];
  const stateGoals = Array.isArray(pipelineResult.goals) ? pipelineResult.goals : [];
  return stateGoals.map((g, idx) => ({ id: g.id || `goal-${idx}`, title: g.title || g.raw || g.outcome || g }));
}

function buildOwnershipIndex(goals = [], users = []) {
  const ownership = {};
  const fallbackUser = users[0]?.id || null;
  goals.forEach((goal, idx) => {
    const owner = goal.ownerUserId || goal.owner || fallbackUser;
    const goalId = goal.id || `goal-${idx}`;
    ownership[goalId] = owner || null;
  });
  return ownership;
}

function buildTaskIndex(pipelineResult = {}, users = []) {
  const tasks = pipelineResult.tasks || [];
  const delegation = pipelineResult.analysis?.teamGovernance?.delegation || {};
  const fallback = users[0]?.id || null;
  const taskIndex = {};
  tasks.forEach((task) => {
    taskIndex[task.id] = delegation[task.id] || fallback;
  });
  return taskIndex;
}

function integrityStatusFromPipeline(pipelineResult = {}) {
  return (
    pipelineResult.analysis?.integrityDeviations?.summary?.teamDeviation ||
    pipelineResult.analysis?.integrityDeviations?.capabilities?.global?.classification ||
    'healthy'
  );
}

export function attachTeamRoles(teamState = {}, pipelineResult = {}) {
  const users = pickUsers(teamState);
  const goals = pickGoals(teamState, pipelineResult);
  const ownershipIndex = buildOwnershipIndex(goals, users);
  const taskIndex = buildTaskIndex(pipelineResult, users);
  const integrityStatus = integrityStatusFromPipeline(pipelineResult);

  const members = users.map((user) => {
    const ownedGoals = Object.entries(ownershipIndex)
      .filter(([, owner]) => owner === user.id)
      .map(([goalId]) => goalId);
    const activeTasks = Object.entries(taskIndex)
      .filter(([, assignee]) => assignee === user.id)
      .map(([taskId]) => taskId);
    let role = ROLE_OBSERVER;
    if (ownedGoals.length > 0) role = ROLE_OWNER;
    else if (activeTasks.length > 0) role = ROLE_CONTRIBUTOR;

    return {
      memberId: user.id,
      name: user.name || user.id,
      role,
      ownedGoals,
      activeTasks,
      integrityStatus
    };
  });

  return {
    members,
    ownershipIndex,
    taskIndex
  };
}

export function buildAccountabilityStrip(session = {}, rolesModel = null) {
  const model = rolesModel || attachTeamRoles(session.team || {}, session.analysis?.pipeline || {});
  const goals = session.team?.goalsById ? Object.values(session.team.goalsById) : [];
  const forecastOnTrack = session.analysis?.forecast?.goalForecast?.onTrack;
  const tasks = session.analysis?.pipeline?.tasks || [];
  const delegation = session.analysis?.teamGovernance?.delegation || {};

  const cycleStatus = forecastOnTrack === true ? 'on_track' : forecastOnTrack === false ? 'off_track' : 'unknown';
  return goals.map((goal, idx) => {
    const goalId = goal.id || `goal-${idx}`;
    const ownerId = model.ownershipIndex[goalId] || null;
    const owner = model.members.find((m) => m.memberId === ownerId) || model.members[0] || {};
    const nextTaskCount =
      tasks.filter((t) => t.goal === goalId || t.goalId === goalId).length ||
      tasks.filter((t) => delegation[t.id] === ownerId).length ||
      tasks.length;
    return {
      goalId,
      goalTitle: goal.title || goal.raw || goal.outcome || goalId,
      ownerName: owner.name || ownerId || 'unknown',
      ownerRole: owner.role || ROLE_OBSERVER,
      cycleStatus,
      riskLevel: session.analysis?.teamGovernance?.summary?.teamLoadStatus || 'stable',
      nextTaskCount
    };
  });
}

export function filterSessionForViewer(session = {}, viewerId = null, rolesModel = null, viewMode = 'team') {
  const model = rolesModel || attachTeamRoles(session.team || {}, session.analysis?.pipeline || {});
  const viewer =
    model.members.find((m) => m.memberId === viewerId) ||
    {
      memberId: viewerId || null,
      role: ROLE_OBSERVER,
      ownedGoals: [],
      activeTasks: [],
      integrityStatus: session.analysis?.integrityDeviations?.capabilities?.global?.classification || 'healthy'
    };

  const strip = buildAccountabilityStrip(session, model);
  let sortedStrip = [...strip];
  if (viewerId) {
    sortedStrip.sort((a, b) => {
      const aOwn = model.ownershipIndex[a.goalId] === viewerId ? -1 : 0;
      const bOwn = model.ownershipIndex[b.goalId] === viewerId ? -1 : 0;
      if (aOwn !== bOwn) return aOwn - bOwn;
      return (a.goalId || '').localeCompare(b.goalId || '');
    });
  }

  const filteredSession = {
    ...session,
    accountabilityStrip: sortedStrip,
    viewer
  };

  if (viewMode === 'mine' && viewerId) {
    filteredSession.analysis = {
      ...session.analysis,
      pipeline: {
        ...session.analysis?.pipeline,
        tasks: (session.analysis?.pipeline?.tasks || []).filter(
          (t) => model.taskIndex[t.id] === viewerId || model.ownershipIndex[t.goal] === viewerId
        )
      }
    };
  }

  return { session: filteredSession, viewer, accountabilityStrip: sortedStrip };
}

export default { attachTeamRoles, buildAccountabilityStrip, filterSessionForViewer };
