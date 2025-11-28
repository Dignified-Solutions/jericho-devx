import { validateSuggestions } from '../../src/llm/suggestion-validator.js';

describe('suggestion-validator', () => {
  it('accepts valid suggestions', () => {
    const result = validateSuggestions({
      suggestions: [
        { id: 's1', type: 'task', domain: 'project', target: 'g1', proposedChange: {}, rationale: 'ok', riskFlags: [], confidence: 0.5 }
      ]
    });
    expect(result.error).toBeNull();
    expect(result.suggestions.length).toBe(1);
    expect(result.suggestions[0].id).toBe('s1');
  });

  it('rejects invalid shape', () => {
    const result = validateSuggestions({});
    expect(result.error).toBeDefined();
    expect(result.suggestions.length).toBe(0);
  });

  it('cleans domains and confidence', () => {
    const result = validateSuggestions({
      suggestions: [{ id: 's2', type: 'task', domain: 'unknown', confidence: 'bad' }]
    });
    expect(result.suggestions[0].domain).toBe('project');
    expect(result.suggestions[0].confidence).toBe(0);
  });
});
