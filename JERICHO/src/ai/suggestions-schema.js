export const SUGGESTIONS_ENVELOPE = {
  source: 'llm', // or 'human'
  goalId: null,
  teamId: null,
  suggestedTasks: [],
  suggestedMessages: [],
  metadata: { reason: '', confidence: 0 }
};

export default { SUGGESTIONS_ENVELOPE };
