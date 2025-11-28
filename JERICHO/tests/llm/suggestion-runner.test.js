import { runSuggestions } from '../../src/llm/suggestion-runner.js';

const mockSession = {
  analysis: { pipeline: { goal: { id: 'g1' } } }
};

describe('suggestion-runner', () => {
  it('returns suggestions with metadata', async () => {
    const mockClient = async () => ({
      model: 'mock-model',
      suggestions: [{ id: 'x', type: 'task', domain: 'project', target: 'g1', proposedChange: {}, rationale: 'mock', riskFlags: [], confidence: 0.2 }]
    });
    const res = await runSuggestions({ session: mockSession, llmClient: mockClient, nowIso: '2024-01-01T00:00:00Z' });
    expect(res.model).toBe('mock-model');
    expect(res.contractVersion).toBeDefined();
    expect(res.generatedAt).toBe('2024-01-01T00:00:00Z');
    expect(res.suggestions.length).toBe(1);
  });
});
