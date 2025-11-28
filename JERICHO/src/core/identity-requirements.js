const DEFAULT_REQUIREMENTS = [
  {
    domain: 'health',
    capability: 'daily-movement',
    targetLevel: 5,
    rationale: 'Sustain baseline physical integrity'
  },
  {
    domain: 'focus',
    capability: 'deep-work',
    targetLevel: 4,
    rationale: 'Create space for meaningful progress'
  }
];

/**
 * Generate identity requirements based on goals.
 * Pure function: no side effects; deterministic from input.
 */
export function deriveIdentityRequirements(goalInput, currentIdentity) {
  const normalizedGoals = (goalInput?.goals || []).map((goal) => ({
    domain: goal.domain,
    capability: goal.capability,
    targetLevel: goal.targetLevel ?? 3,
    rationale: goal.rationale || 'Unspecified rationale'
  }));

  const baseline = Array.isArray(DEFAULT_REQUIREMENTS)
    ? DEFAULT_REQUIREMENTS
    : [];

  const merged = [...baseline, ...normalizedGoals];

  const deduped = merged.reduce((acc, item) => {
    const key = `${item.domain}:${item.capability}`;
    if (acc.map.has(key)) {
      const existing = acc.map.get(key);
      // Keep the stricter target to avoid regressions.
      const stricterTarget = Math.max(existing.targetLevel, item.targetLevel);
      acc.map.set(key, { ...existing, targetLevel: stricterTarget });
    } else {
      acc.map.set(key, item);
    }
    return acc;
  }, { map: new Map() });

  return Array.from(deduped.map.values()).map((requirement) => ({
    ...requirement,
    currentLevel: resolveCurrentLevel(requirement, currentIdentity)
  }));
}

function resolveCurrentLevel(requirement, currentIdentity) {
  const identity = currentIdentity?.[requirement.domain]?.[requirement.capability];
  if (identity === undefined || identity === null) {
    return 0;
  }
  if (typeof identity === 'number') {
    return identity;
  }
  if (typeof identity === 'object' && typeof identity.level === 'number') {
    return identity.level;
  }
  return 0;
}
