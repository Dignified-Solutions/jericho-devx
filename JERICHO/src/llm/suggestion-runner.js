import { getLLMContract } from '../ai/llm-contract.js';
import { callLLM } from './llm-client.js';
import { validateSuggestions } from './suggestion-validator.js';

export async function runSuggestions({ session, contract = null, llmClient = null, nowIso = null } = {}) {
  const activeContract = contract || getLLMContract();
  const client = llmClient || callLLM;
  const payload = {
    contract: activeContract,
    session
  };
  const llmResult = await client(payload, {});
  const validated = validateSuggestions(llmResult);

  return {
    suggestions: validated.suggestions,
    contractVersion: activeContract.version,
    generatedAt: nowIso || new Date().toISOString(),
    model: llmResult.model || 'stub',
    error: validated.error || null
  };
}

export default { runSuggestions };
