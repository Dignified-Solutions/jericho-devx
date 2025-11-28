const EPS = 0.05;
const MAX_RECOMMENDATIONS = 5;

export function analyzeAndOptimizePortfolio({
  identityRequirements = [],
  strategicCalendar = {},
  nextCycleIndex = 0,
  compressedPlan = { kept: [], deferred: [], dropped: [], summary: {} },
  tasksById = {}
}) {
  void strategicCalendar;
  const domainTargets = computeTargetWeights(identityRequirements);
  const keptInCycle = (compressedPlan.kept || []).filter((d) => d.cycle === nextCycleIndex);
  const actualWeights = computeActualWeights(keptInCycle, tasksById, domainTargets);

  const domainUnion = Array.from(new Set([...Object.keys(domainTargets), ...Object.keys(actualWeights)])).sort();
  const domains = domainUnion.map((domain) => {
    const targetWeight = domainTargets[domain] ?? 0;
    const actualWeight = actualWeights[domain] ?? 0;
    const delta = actualWeight - targetWeight;
    let status = 'balanced';
    if (delta < -EPS) status = 'under';
    else if (delta > EPS) status = 'over';
    return { domain, targetWeight, actualWeight, delta, status };
  });

  const promote = buildPromotions(domains, identityRequirements);
  const demote = buildDemotions(domains, keptInCycle, tasksById);

  return {
    currentMix: { domains },
    recommendations: { promote, demote }
  };
}

function computeTargetWeights(identityRequirements) {
  const totals = new Map();
  let totalWeight = 0;
  for (const req of identityRequirements || []) {
    const w = req.weight ?? 0;
    totals.set(req.domain, (totals.get(req.domain) || 0) + w);
    totalWeight += w;
  }
  if (totalWeight <= 0 && totals.size > 0) {
    const equal = 1 / totals.size;
    return Array.from(totals.keys()).reduce((acc, d) => ({ ...acc, [d]: equal }), {});
  }
  const result = {};
  for (const [domain, w] of totals.entries()) {
    result[domain] = totalWeight > 0 ? w / totalWeight : 0;
  }
  return result;
}

function computeActualWeights(keptDecisions, tasksById, domainTargets) {
  const totals = new Map();
  for (const decision of keptDecisions || []) {
    const task = tasksById[decision.id];
    if (!task) continue;
    const impact = task.impactWeight ?? 0;
    totals.set(task.domain, (totals.get(task.domain) || 0) + impact);
  }
  const actualTotal = Array.from(totals.values()).reduce((acc, v) => acc + v, 0);
  const result = {};
  const domains = new Set([...Object.keys(domainTargets), ...totals.keys()]);
  for (const d of domains) {
    const val = totals.get(d) || 0;
    result[d] = actualTotal > 0 ? val / actualTotal : 0;
  }
  return result;
}

function buildPromotions(domains, identityRequirements) {
  const underDomains = domains.filter((d) => d.status === 'under').map((d) => d.domain);
  const candidates = identityRequirements
    .filter((req) => underDomains.includes(req.domain))
    .map((req) => ({
      capabilityId: req.id,
      domain: req.domain,
      capability: req.capability,
      score: (req.weight ?? 0) * (req.targetLevel ?? 5),
      reason: 'under_weighted_domain'
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.capability.localeCompare(b.capability);
    });
  return candidates.slice(0, MAX_RECOMMENDATIONS).map(({ capabilityId, domain, reason }) => ({
    capabilityId,
    domain,
    reason
  }));
}

function buildDemotions(domains, keptDecisions, tasksById) {
  const overDomains = domains.filter((d) => d.status === 'over').map((d) => d.domain);
  const candidates = keptDecisions
    .filter((d) => {
      const task = tasksById[d.id];
      return task && overDomains.includes(task.domain);
    })
    .map((d) => {
      const task = tasksById[d.id];
      return {
        taskId: d.id,
        domain: task.domain,
        impact: task.impactWeight ?? 0,
        difficulty: task.difficulty ?? 3,
        reason: 'over_weighted_domain'
      };
    })
    .sort((a, b) => {
      if (a.impact !== b.impact) return a.impact - b.impact;
      if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
      return a.taskId.localeCompare(b.taskId);
    });

  return candidates.slice(0, MAX_RECOMMENDATIONS).map(({ taskId, domain, reason }) => ({
    taskId,
    domain,
    reason
  }));
}
