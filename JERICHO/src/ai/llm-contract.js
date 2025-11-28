const VERSION = '1.0.0';
const UPDATED_AT = '2024-01-01T00:00:00.000Z';

const READ_ENDPOINTS = [
  { path: '/pipeline', method: 'GET', response: 'pipeline_snapshot', deterministic: true },
  { path: '/ai/session', method: 'GET', response: 'ai_session_snapshot', deterministic: true },
  { path: '/ai/view', method: 'GET', response: 'scene_graph', deterministic: true },
  { path: '/ai/directives', method: 'GET', response: 'directive_list', deterministic: true },
  { path: '/ai/narrative', method: 'GET', response: 'narrative_block', deterministic: true },
  { path: '/team/export', method: 'GET', response: 'team_export', deterministic: true },
  { path: '/ai/session/view', method: 'GET', params: ['viewerId'], response: 'viewer_filtered_session', deterministic: true },
  { path: '/ai/llm-contract', method: 'GET', response: 'llm_contract', deterministic: true }
];

const RESPONSE_SCHEMAS = {
  pipeline_snapshot: {
    fields: ['goal', 'identityBefore', 'identityAfter', 'tasks', 'integrity', 'history', 'analysis', 'schedule', 'taskBoard']
  },
  ai_session_snapshot: {
    fields: ['version', 'state', 'analysis', 'team', 'teamRoles', 'accountabilityStrip', 'meta']
  },
  scene_graph: {
    fields: ['sceneVersion', 'panels']
  },
  directive_list: {
    fields: ['directives', 'analysis']
  },
  narrative_block: {
    fields: ['narrative', 'scene']
  },
  team_export: {
    fields: ['team', 'goals', 'tasks', 'governance', 'integrity', 'reasoning']
  },
  viewer_filtered_session: {
    fields: ['session', 'viewer', 'accountabilityStrip']
  },
  llm_contract: {
    fields: ['version', 'updatedAt', 'endpoints', 'suggestions', 'privacy']
  }
};

const SUGGESTIONS_SPEC = {
  channel: 'suggestions',
  requires_human_confirmation: true,
  allowed: {
    suggestedTasks: {
      maxItems: 10,
      fields: ['tempId', 'title', 'goalId', 'owner', 'notes']
    },
    suggestedGoalRefinements: {
      maxItems: 5,
      fields: ['goalId', 'proposal']
    },
    suggestedMessages: {
      maxItems: 10,
      fields: ['to', 'body', 'relatedGoalId']
    }
  }
};

const PRIVACY = {
  fields: {
    integrityHistory: { internal_only: true },
    rawNotes: { internal_only: true },
    viewerSensitive: { internal_only: true }
  }
};

export function getLLMContract() {
  return {
    version: VERSION,
    updatedAt: UPDATED_AT,
    endpoints: READ_ENDPOINTS.map((e) => ({ ...e })),
    responses: { ...RESPONSE_SCHEMAS },
    suggestions: { ...SUGGESTIONS_SPEC },
    privacy: { ...PRIVACY }
  };
}

export default { getLLMContract };
