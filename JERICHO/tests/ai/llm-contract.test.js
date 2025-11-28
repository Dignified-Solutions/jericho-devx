import { getLLMContract } from '../../src/ai/llm-contract.js';
import { SUGGESTIONS_ENVELOPE } from '../../src/ai/suggestions-schema.js';

describe('llm-contract', () => {
  it('returns serializable contract', () => {
    const contract = getLLMContract();
    expect(() => JSON.stringify(contract)).not.toThrow();
    expect(contract.version).toBeDefined();
    expect(contract.updatedAt).toBeDefined();
    expect(Array.isArray(contract.endpoints)).toBe(true);
    expect(contract.suggestions).toBeDefined();
    expect(contract.privacy).toBeDefined();
  });

  it('endpoints include method and path', () => {
    const contract = getLLMContract();
    contract.endpoints.forEach((ep) => {
      expect(ep.path).toBeDefined();
      expect(ep.method).toBeDefined();
    });
  });

  it('suggestions are constrained and require confirmation', () => {
    const contract = getLLMContract();
    expect(contract.suggestions.requires_human_confirmation).toBe(true);
    expect(contract.suggestions.allowed.suggestedTasks).toBeDefined();
  });

  it('privacy flags include internal_only fields', () => {
    const contract = getLLMContract();
    expect(contract.privacy.fields.integrityHistory.internal_only).toBe(true);
  });

  it('suggestions envelope matches expected shape', () => {
    expect(SUGGESTIONS_ENVELOPE.source).toBeDefined();
    expect(SUGGESTIONS_ENVELOPE.suggestedTasks).toEqual([]);
    expect(SUGGESTIONS_ENVELOPE.metadata).toHaveProperty('confidence');
  });
});
