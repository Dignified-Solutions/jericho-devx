import { runSuggestions } from '../../src/llm/suggestion-runner.js';

describe('api llm suggestions (logic)', () => {
  it('produces suggestion payload shape', async () => {
    const session = { analysis: { pipeline: { goal: { id: 'g1' } } } };
    const mockClient = async () => ({
      model: 'stub',
      suggestions: [{ id: 's', type: 'task', domain: 'project', target: 'g1', proposedChange: {}, rationale: 'r', riskFlags: [], confidence: 0.1 }]
    });
    const res = await runSuggestions({ session, llmClient: mockClient, nowIso: '2024-01-01T00:00:00Z' });
    expect(res.ok).toBeUndefined();
    expect(res.suggestions.length).toBe(1);
    expect(res.contractVersion).toBeDefined();
  });
});
