import { randomUUID } from 'crypto';

const CATEGORY_REQUIREMENTS = {
  creative_project: [
    { domain: 'Execution', capability: 'discipline', targetLevel: 8, weight: 0.25 },
    { domain: 'Execution', capability: 'consistency', targetLevel: 9, weight: 0.25 },
    { domain: 'Output', capability: 'daily_output', targetLevel: 8, weight: 0.2 },
    { domain: 'Planning', capability: 'roadmapping', targetLevel: 7, weight: 0.15 },
    { domain: 'Planning', capability: 'time_blocking', targetLevel: 7, weight: 0.15 }
  ],
  product_launch: [
    { domain: 'Execution', capability: 'discipline', targetLevel: 8, weight: 0.2 },
    { domain: 'Execution', capability: 'follow_through', targetLevel: 9, weight: 0.2 },
    { domain: 'Output', capability: 'shipping_frequency', targetLevel: 8, weight: 0.2 },
    { domain: 'Planning', capability: 'roadmapping', targetLevel: 8, weight: 0.2 },
    { domain: 'Planning', capability: 'time_blocking', targetLevel: 7, weight: 0.2 }
  ],
  body_composition: [
    { domain: 'Execution', capability: 'consistency', targetLevel: 9, weight: 0.3 },
    { domain: 'Health', capability: 'energy_management', targetLevel: 8, weight: 0.25 },
    { domain: 'Health', capability: 'sleep_hygiene', targetLevel: 7, weight: 0.2 },
    { domain: 'Output', capability: 'daily_output', targetLevel: 6, weight: 0.25 }
  ],
  learning_goal: [
    { domain: 'Execution', capability: 'deep_work', targetLevel: 8, weight: 0.3 },
    { domain: 'Execution', capability: 'consistency', targetLevel: 8, weight: 0.25 },
    { domain: 'Learning', capability: 'study_hours', targetLevel: 9, weight: 0.25 },
    { domain: 'Planning', capability: 'time_blocking', targetLevel: 7, weight: 0.2 }
  ],
  generic_execution: [
    { domain: 'Execution', capability: 'discipline', targetLevel: 7, weight: 0.3 },
    { domain: 'Execution', capability: 'consistency', targetLevel: 7, weight: 0.3 },
    { domain: 'Planning', capability: 'time_blocking', targetLevel: 6, weight: 0.2 },
    { domain: 'Output', capability: 'daily_output', targetLevel: 6, weight: 0.2 }
  ]
};

export function classifyGoalCategory(goal) {
  const outcome = (goal?.outcome || goal?.raw || '').toLowerCase();

  if (includesAny(outcome, ['album', 'song', 'mixtape', 'book', 'script', 'video', 'podcast', 'content'])) {
    return 'creative_project';
  }
  if (includesAny(outcome, ['app', 'product', 'platform', 'feature', 'startup', 'launch'])) {
    return 'product_launch';
  }
  if (includesAny(outcome, ['pounds', 'lb', 'kg', 'weight', 'body fat', 'fat', 'muscle'])) {
    return 'body_composition';
  }
  if (includesAny(outcome, ['exam', 'test', 'bar', 'license', 'certification', 'degree', 'course'])) {
    return 'learning_goal';
  }
  return 'generic_execution';
}

export function deriveIdentityRequirements(goal) {
  const category = classifyGoalCategory(goal);
  const base = CATEGORY_REQUIREMENTS[category] || CATEGORY_REQUIREMENTS.generic_execution;
  return base.map((item) => ({
    id: randomUUID(),
    domain: item.domain,
    capability: item.capability,
    targetLevel: clamp(item.targetLevel, 1, 10),
    weight: clamp(item.weight, 0, 1),
    rationale: buildRationale(category, item.capability)
  }));
}

function includesAny(text, list) {
  return list.some((word) => text.includes(word));
}

function buildRationale(category, capability) {
  const rationaleByCategory = {
    creative_project: 'Required to ship creative work on schedule.',
    product_launch: 'Required to launch reliably and hit release targets.',
    body_composition: 'Required to maintain health and composition targets.',
    learning_goal: 'Required to progress through learning milestones.',
    generic_execution: 'Required to sustain consistent execution.'
  };
  return `${rationaleByCategory[category] || rationaleByCategory.generic_execution} Focus: ${capability}.`;
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}
