import { attachTeamRoles, buildAccountabilityStrip } from './team-roles.js';

const SESSION_VERSION = 'jericho-ai-session-v1';

export function buildSessionSnapshot({
  state,
  pipelineOutput,
  scene,
  narrative,
  directives,
  commandSpec,
  reasoning,
  chain,
  multiGoal,
  integrityDeviations,
  teamRoles,
  accountabilityStrip
}) {
  const team = state?.team || {};
  const teamIdentity = pipelineOutput?.analysis?.teamIdentity || null;
  const teamGovernance = pipelineOutput?.analysis?.teamGovernance || null;
  const teamNarrative = pipelineOutput?.analysis?.teamNarrative || null;
  const resolvedTeamRoles = teamRoles || attachTeamRoles(team, pipelineOutput);

  const snapshot = {
    version: SESSION_VERSION,
    state,
    teamIdentity: teamIdentity,
    teamGovernance: teamGovernance,
    teamNarrative: teamNarrative,
    teamRoles: resolvedTeamRoles,
    team: {
      users: team.users || [],
      teams: team.teams || [],
      roles: team.roles || {},
      goalsById: team.goalsById || {},
      teamCycles: team.teamCycles || {}
    },
    analysis: {
      pipeline: pipelineOutput,
      narrative,
      directives: {
        list: directives?.directives || [],
        summary: directives?.summary || ''
      },
      scene,
      reasoning: reasoning || null,
      chain: chain || null,
      multiGoal: multiGoal || null,
      integrityDeviations: integrityDeviations || null,
      teamIdentity,
      teamGovernance,
      teamNarrative
    },
    meta: {
      commands: commandSpec || {},
      invariants: {
        deterministic: true,
        readOnly: true
      }
    }
  };

  snapshot.accountabilityStrip =
    accountabilityStrip || buildAccountabilityStrip(snapshot, resolvedTeamRoles);

  return snapshot;
}

export default { buildSessionSnapshot };
