export async function callLLM(payload = {}, options = {}) {
  // Stubbed deterministic response when no external key is provided.
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return {
      model: 'stub',
      suggestions: [
        {
          id: 'sug-stub-1',
          type: 'task',
          domain: 'project',
          target: payload.session?.analysis?.pipeline?.goal?.id || 'goal-1',
          proposedChange: { action: 'add_task', title: 'stub-task' },
          rationale: 'stubbed',
          riskFlags: [],
          confidence: 0.1
        }
      ]
    };
  }

  // Placeholder for future real LLM integration.
  // This path remains deterministic in tests by mocking callLLM.
  return {
    model: options.model || 'external-llm',
    suggestions: []
  };
}

export default { callLLM };
