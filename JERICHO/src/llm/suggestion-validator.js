import { SUGGESTIONS_ENVELOPE } from '../ai/suggestions-schema.js';

const ALLOWED_FIELDS = ['id', 'type', 'domain', 'target', 'proposedChange', 'rationale', 'riskFlags', 'confidence'];
const ALLOWED_DOMAINS = ['identity', 'project', 'health', 'calendar', 'team'];
const DEFAULT_SUGGESTION = {
  id: 'sug-default',
  type: 'task',
  domain: 'project',
  target: null,
  proposedChange: {},
  rationale: 'fallback',
  riskFlags: [],
  confidence: 0
};

export function validateSuggestions(raw) {
  const result = { suggestions: [], error: null };
  if (!raw || !Array.isArray(raw.suggestions)) {
    result.error = 'Invalid suggestions payload';
    return result;
  }

  const cleaned = raw.suggestions.map((sug, idx) => {
    const safe = { ...DEFAULT_SUGGESTION, id: sug?.id || `sug-${idx}` };
    ALLOWED_FIELDS.forEach((field) => {
      if (sug && field in sug) {
        safe[field] = sug[field];
      }
    });
    if (!ALLOWED_DOMAINS.includes(safe.domain)) safe.domain = 'project';
    if (typeof safe.confidence !== 'number' || Number.isNaN(safe.confidence)) safe.confidence = 0;
    if (!Array.isArray(safe.riskFlags)) safe.riskFlags = [];
    return safe;
  });

  result.suggestions = cleaned.slice(0, SUGGESTIONS_ENVELOPE.suggestedTasks.length || 100);
  return result;
}

export default { validateSuggestions };
