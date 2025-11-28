import { deriveIdentityRequirements } from './identity-requirements.js';
import { computeCapabilityGaps, rankCapabilityGaps } from './gap-analysis.js';
import { generateTasksForCycle } from './task-generator.js';
import { validateGoal } from './validate-goal.js';
import { computeIntegrityScore, explainIntegrityScore } from './scoring-engine.js';
import { applyIdentityUpdate } from './identity-update.js';
import { buildDaySlots, scheduleTasksIntoSlots } from './temporal-engine.js';
import { analyzeFailurePatterns } from './failure-engine.js';
import { computeForecast } from './forecast-engine.js';
import { evaluateSystemHealth } from './meta-engine.js';
import { decomposeGoal } from './goal-decomposition.js';
import { buildStrategicCalendar } from './strategic-calendar.js';
import { compressTasksForCycle } from './task-compression.js';
import { analyzeAndOptimizePortfolio } from './portfolio-optimizer.js';
import { evaluateCycleGovernance } from './cycle-governance.js';
import { explainTaskReasons } from './explanations.js';
import { analyzeIntegrityDeviations } from './integrity-deviation-engine.js';
import { analyzeTeamIdentity } from './team-identity-engine.js';
import evaluateTeamGovernance from './team-governance-engine.js';
import compileTeamNarrative from './team-narrative-engine.js';

/**
 * Run the closed-loop pipeline once for the provided goal input and identity state.
 * goalInput: { goals: string[] }
 */
export function runPipeline(goalInput, identity, history = [], tasks = [], team = undefined) {
  const rawGoal = Array.isArray(goalInput?.goals) ? goalInput.goals[0] : '';
  const validation = validateGoal(rawGoal);
  const identityState = normalizeIdentity(identity);

  if (!validation.valid) {
    return {
      goal: null,
      error: validation.error,
      identityBefore: identityState,
      identityAfter: identityState,
      requirements: [],
      gaps: [],
      rankedGaps: [],
      tasks: [],
      integrity: {
        score: 0,
        completedCount: 0,
        missedCount: 0,
        pendingCount: 0,
        rawTotal: 0,
        maxPossible: 0,
        breakdown: {
          completedOnTime: 0,
          completedLate: 0,
          missed: 0,
          totalTasks: 0,
          completionRate: 0,
          onTimeRate: 0
        },
        lastRun: null
      },
      changes: [],
      history
    };
  }

  const goal = validation.goal;
  const requirements = deriveIdentityRequirements(goal);
  const gapsBefore = computeCapabilityGaps(identityState, requirements);
  const rankedGapsBefore = rankCapabilityGaps(gapsBefore);

  const integritySummary = computeIntegrityScore(tasks);
  const integrityExplanation = explainIntegrityScore(tasks);

  const { updatedIdentity, changes } = applyIdentityUpdate(
    identityState,
    rankedGapsBefore,
    integritySummary,
    tasks
  );

  const gapsAfter = computeCapabilityGaps(updatedIdentity, requirements);
  const rankedGapsAfter = rankCapabilityGaps(gapsAfter);

  const nextCycleTasks = generateTasksForCycle(goal, rankedGapsAfter, { maxTasks: 5, cycleDays: 7 }).map(
    (task, idx) => ({
      ...task,
      id: `task-${rankedGapsAfter[idx]?.capability || task.capability || 'cap'}-${idx}`
    })
  );

  const now = new Date();
  const nowIso = now.toISOString();
  const cycleStartIso = nowIso;
  const cycleEnd = new Date(now);
  cycleEnd.setDate(cycleEnd.getDate() + 7);
  const cycleEndIso = cycleEnd.toISOString();

  const daySlots = buildDaySlots(cycleStartIso, cycleEndIso);
  const { daySlots: scheduledDaySlots, overflowTasks, todayPriorityTaskId } = scheduleTasksIntoSlots(
    nextCycleTasks,
    daySlots,
    integritySummary
  );

  const historyEntry = {
    timestamp: nowIso,
    goalId: goal.id,
    integrity: {
      ...integritySummary,
      breakdown: integrityExplanation.breakdown
    },
    identityBefore: identityState,
    identityAfter: updatedIdentity,
    changes
  };
  const updatedHistory = [...(history || []), historyEntry];

  const failureAnalysis = analyzeFailurePatterns(updatedHistory, integritySummary);
  const forecast = computeForecast(goal, requirements, updatedHistory);
  const totalScheduledTasks = scheduledDaySlots
    .flatMap((d) => d.slots)
    .reduce((acc, slot) => acc + slot.taskIds.length, 0);
  const scheduleSummary = {
    daySlotsCount: scheduledDaySlots.length,
    totalScheduledTasks,
    totalOverflowTasks: overflowTasks.length
  };
  const systemHealth = evaluateSystemHealth({
    goal,
    history: updatedHistory,
    integritySummary,
    scheduleSummary,
    failureAnalysis,
    forecast
  });

  const milestones = decomposeGoal(goal, requirements, forecast);
  const strategicCalendar = buildStrategicCalendar(goal, milestones, forecast);
  const tasksById = buildTasksByIdMap(nextCycleTasks);
  const nextCycleIndex = updatedHistory.length;
  const compressedPlan = compressTasksForCycle({
    goal,
    nextCycleIndex,
    tasks: nextCycleTasks.map((task) => ({
      id: task.id,
      capabilityId: task.requirementId || task.id,
      domain: task.domain,
      capability: task.capability,
      difficulty: task.difficulty ?? 3,
      impactWeight: task.estimatedImpact ?? 0,
      deadlineCycle: null
    })),
    governance: systemHealth?.governance,
    strategicCalendar
  });
  const portfolio = analyzeAndOptimizePortfolio({
    identityRequirements: requirements,
    strategicCalendar,
    nextCycleIndex,
    compressedPlan,
    tasksById
  });
  const cycleGovernance = evaluateCycleGovernance({
    goal,
    nextCycleIndex,
    systemHealth,
    failureAnalysis,
    forecast,
    strategicCalendar,
    compressedPlan,
    portfolioAnalysis: portfolio
  });
  const teamGovernance = evaluateTeamGovernance(team || {}, goalInput?.goals || [], identityState, nextCycleTasks);
  const integrityDeviations = analyzeIntegrityDeviations(updatedHistory, integritySummary, teamGovernance);
  const teamIdentity = analyzeTeamIdentity({
    team,
    identity: identityState,
    goals: goalInput?.goals || requirements,
    history: updatedHistory
  });
  const teamNarrative = compileTeamNarrative({
    goals: Array.isArray(goalInput?.goals) ? goalInput.goals : goal ? [goal] : [],
    team: team || {},
    tasks: nextCycleTasks,
    teamGovernance,
    sessionMeta: { cycleIndex: updatedHistory.length }
  });

  const decisionById = buildDecisionMap(compressedPlan);
  const reasonsById = buildReasonMap(compressedPlan);
  const domainStatusByName = buildDomainStatusMap(portfolio);
  const allowedTasks = cycleGovernance?.allowedTasks ?? null;
  const governanceEligibleById = buildGovernanceEligibilityMap({
    tasks: nextCycleTasks,
    decisionById,
    allowedTasks,
    nextCycleIndex
  });

  const taskViews = nextCycleTasks.map((task) => {
    const decision = decisionById.get(task.id) || 'none';
    const domain = task.domain || task.capabilityDomain || 'unknown';
    const domainStatus = domainStatusByName.get(domain) || 'balanced';
    const baseReasons = reasonsById.get(task.id) || [];
    const governanceEligible = !!governanceEligibleById.get(task.id);
    const taskCycle = task.cycle != null ? task.cycle : nextCycleIndex;

    const reasons = [...baseReasons];
    if (domainStatus === 'over') reasons.push('over_weighted_domain');
    if (domainStatus === 'under') reasons.push('under_weighted_domain');
    if (decision === 'defer') reasons.push('deferred_by_compression');
    if (decision === 'drop') reasons.push('dropped_by_compression');
    if (decision === 'keep' && !governanceEligible && allowedTasks != null) {
      reasons.push('above_cycle_cap');
    }

    const explanations = explainTaskReasons({
      ...task,
      decision,
      governanceEligible,
      domainStatus,
      reasons,
      cycle: taskCycle
    });

    return {
      ...task,
      decision,
      governanceEligible,
      domainStatus,
      reasons,
      explanations,
      cycle: taskCycle
    };
  });

  const taskBoard = {
    tasks: taskViews,
    summary: {
      allowedTasks,
      keptCount: taskViews.filter((t) => t.decision === 'keep').length,
      deferredCount: taskViews.filter((t) => t.decision === 'defer').length,
      droppedCount: taskViews.filter((t) => t.decision === 'drop').length,
      eligibleCount: taskViews.filter((t) => t.decision === 'keep' && t.governanceEligible).length
    }
  };

  return {
    goal,
    identityBefore: identityState,
    identityAfter: updatedIdentity,
    requirements,
    gaps: gapsAfter,
    rankedGaps: rankedGapsAfter,
    tasks: nextCycleTasks,
    integrity: {
      ...integritySummary,
      breakdown: integrityExplanation.breakdown,
      lastRun: nowIso
    },
    changes,
    history: updatedHistory,
    schedule: {
      daySlots: scheduledDaySlots,
      overflowTasks,
      todayPriorityTaskId,
      cycleStart: cycleStartIso,
      cycleEnd: cycleEndIso
    },
    taskBoard,
    analysis: {
      failure: failureAnalysis,
      forecast,
      systemHealth,
      milestones,
      strategicCalendar,
    compressedPlan,
    portfolio,
    cycleGovernance,
    integrityDeviations,
    teamIdentity,
    teamGovernance,
    teamNarrative
  }
  };
}

function buildTasksByIdMap(tasks = []) {
  const map = {};
  for (const task of tasks) {
    map[task.id] = task;
  }
  return map;
}

function buildDecisionMap(compressedPlan = {}) {
  const map = new Map();
  const add = (arr = [], decision) => {
    arr.forEach((item) => map.set(item.id, decision));
  };
  add(compressedPlan.kept, 'keep');
  add(compressedPlan.deferred || compressedPlan.defer, 'defer');
  add(compressedPlan.dropped, 'drop');
  return map;
}

function buildReasonMap(compressedPlan = {}) {
  const map = new Map();
  const add = (arr = []) => {
    arr.forEach((item) => {
      const reasons = Array.isArray(item.reasonCodes) ? [...item.reasonCodes] : [];
      map.set(item.id, reasons);
    });
  };
  add(compressedPlan.kept);
  add(compressedPlan.deferred || compressedPlan.defer);
  add(compressedPlan.dropped);
  return map;
}

function buildDomainStatusMap(portfolio = {}) {
  const map = new Map();
  const domains = portfolio?.currentMix?.domains || [];
  domains.forEach((d) => {
    if (d?.domain) {
      map.set(d.domain, d.status || 'balanced');
    }
  });
  return map;
}

function buildGovernanceEligibilityMap({ tasks = [], decisionById, allowedTasks, nextCycleIndex }) {
  const keptNextCycle = tasks.filter((task) => {
    const keep = decisionById.get(task.id) === 'keep';
    const cycleMatches = task.cycle === nextCycleIndex || task.cycle == null;
    return keep && cycleMatches;
  });

  keptNextCycle.sort((a, b) => {
    const impactA = a.estimatedImpact ?? a.impactWeight ?? 0;
    const impactB = b.estimatedImpact ?? b.impactWeight ?? 0;
    if (impactB !== impactA) return impactB - impactA;
    return (a.id || '').localeCompare(b.id || '');
  });

  const governanceEligibleById = new Map();
  const limit =
    allowedTasks == null ? keptNextCycle.length : Math.min(allowedTasks, keptNextCycle.length);

  keptNextCycle.forEach((task, index) => {
    governanceEligibleById.set(task.id, index < limit);
  });

  return governanceEligibleById;
}

function normalizeIdentity(identity) {
  if (Array.isArray(identity)) {
    return identity.map((entry) => ({
      id: entry.id || `${entry.domain || 'domain'}-${entry.capability || 'cap'}`,
      domain: entry.domain,
      capability: entry.capability,
      level: clamp(entry.level, 1, 10)
    }));
  }

  if (identity && typeof identity === 'object') {
    // identity keyed by capability id or by domain->capability
    const flattened = [];
    Object.entries(identity).forEach(([domainKey, value]) => {
      if (value && typeof value === 'object' && 'level' in value) {
        flattened.push({
          id: domainKey,
          domain: value.domain || domainKey,
          capability: value.capability || domainKey,
          level: clamp(value.level, 1, 10)
        });
      } else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([capKey, capVal]) => {
          if (capVal && typeof capVal === 'object') {
            flattened.push({
              id: `${domainKey}-${capKey}`,
              domain: domainKey,
              capability: capKey,
              level: clamp(capVal.level, 1, 10)
            });
          }
        });
      }
    });
    return flattened;
  }

  return [];
}

function clamp(val, min, max) {
  const num = Number(val);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}
