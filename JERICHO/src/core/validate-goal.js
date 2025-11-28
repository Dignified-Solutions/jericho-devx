import { randomUUID } from 'crypto';

const binaryVerbs = ['finish', 'complete', 'release', 'launch', 'pass', 'submit', 'deliver'];
const repeatedPatterns = /(per\s+(day|week|month|hour))|daily|weekly|monthly|every\s+\w+/i;

export function validateGoal(rawGoalInput) {
  if (typeof rawGoalInput !== 'string') {
    return { valid: false, error: 'invalid_outcome' };
  }

  const parts = rawGoalInput.split(/\sby\s/i);
  if (parts.length !== 2) {
    return { valid: false, error: 'missing_by_keyword' };
  }

  const outcomeRaw = parts[0].trim();
  const deadlineRaw = parts[1].trim();

  const outcomeCheck = validateOutcome(outcomeRaw);
  if (!outcomeCheck.valid) {
    return outcomeCheck;
  }

  const deadlineCheck = validateDeadline(deadlineRaw);
  if (!deadlineCheck.valid) {
    return deadlineCheck;
  }

  const metric = outcomeCheck.metric;
  const type = classifyType(outcomeRaw, metric);

  return {
    valid: true,
    goal: {
      id: randomUUID(),
      raw: rawGoalInput,
      outcome: outcomeCheck.outcome,
      metric,
      deadline: deadlineCheck.deadline,
      type
    }
  };
}

function validateOutcome(outcomeRaw) {
  const lower = outcomeRaw.toLowerCase();
  if (!lower.startsWith('i will')) {
    return { valid: false, error: 'invalid_outcome' };
  }

  if (/\band\b/i.test(outcomeRaw)) {
    return { valid: false, error: 'compound_goal' };
  }

  const numberMatch = outcomeRaw.match(/(\d+(\.\d+)?)/);
  const verbMatch = binaryVerbs.find((verb) => new RegExp(`\\b${verb}\\b`, 'i').test(outcomeRaw));

  if (!numberMatch && !verbMatch) {
    if (/(improve|better|more|some|try)/i.test(outcomeRaw)) {
      return { valid: false, error: 'vague_outcome' };
    }
    return { valid: false, error: 'missing_metrics' };
  }

  return { valid: true, outcome: outcomeRaw, metric: numberMatch ? numberMatch[0] : verbMatch };
}

function validateDeadline(deadlineRaw) {
  if (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(deadlineRaw)) {
    return { valid: false, error: 'ambiguous_deadline' };
  }
  const date = new Date(deadlineRaw);
  if (Number.isNaN(date.getTime())) {
    return { valid: false, error: 'invalid_deadline' };
  }
  return { valid: true, deadline: date.toISOString() };
}

function classifyType(outcomeRaw, metric) {
  if (repeatedPatterns.test(outcomeRaw)) {
    return 'production';
  }
  if (metric && !isNaN(Number(metric))) {
    return 'production';
  }
  return 'event';
}
