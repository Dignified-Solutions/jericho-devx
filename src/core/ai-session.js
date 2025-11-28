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
  integrityDeviations
}) {
  const team = state?.team || {};
  return {
    version: SESSION_VERSION,
    state,
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
      integrityDeviations: integrityDeviations || null
    },
    meta: {
      commands: commandSpec || {},
      invariants: {
        deterministic: true,
        readOnly: true
      }
    }
  };
}

export default { buildSessionSnapshot };
