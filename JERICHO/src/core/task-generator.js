import { randomUUID } from 'crypto';

const CAPABILITY_TASK_TEMPLATES = {
  discipline: [
    {
      title: 'Honor a fixed work block',
      description: (goal) =>
        `Commit to a single uninterrupted block of work today dedicated to: ${goal.outcome}.`,
      difficulty: 2,
      estimatedImpact: 0.6
    }
  ],
  consistency: [
    {
      title: 'Set and follow a daily start time',
      description: () => 'Choose a realistic daily start time and honor it for this cycle.',
      difficulty: 2,
      estimatedImpact: 0.7
    }
  ],
  deep_work: [
    {
      title: 'Deep work session',
      description: (goal) =>
        `Schedule and complete a 90-minute deep work session moving ${goal.outcome} forward.`,
      difficulty: 3,
      estimatedImpact: 0.8
    }
  ],
  follow_through: [
    {
      title: 'Close an open loop',
      description: () => 'Identify one key unfinished commitment and close it completely.',
      difficulty: 2,
      estimatedImpact: 0.6
    }
  ],
  daily_output: [
    {
      title: 'Ship a daily unit of output',
      description: (goal) =>
        `Produce and finish one concrete unit of work related to: ${goal.outcome}.`,
      difficulty: 2,
      estimatedImpact: 0.7
    }
  ],
  shipping_frequency: [
    {
      title: 'Schedule shipping milestones',
      description: (goal) =>
        `Define and calendar 2–3 shipping checkpoints for ${goal.outcome} within this cycle.`,
      difficulty: 2,
      estimatedImpact: 0.7
    }
  ],
  roadmapping: [
    {
      title: 'Create a simple roadmap',
      description: (goal) =>
        `List the 3–5 major stages required to complete ${goal.outcome}.`,
      difficulty: 1,
      estimatedImpact: 0.5
    }
  ],
  time_blocking: [
    {
      title: 'Time-block your next week',
      description: () => 'Assign fixed time blocks for focused work over the next 7 days.',
      difficulty: 2,
      estimatedImpact: 0.6
    }
  ],
  energy_management: [
    {
      title: 'Identify energy leaks',
      description: () =>
        'List three habits that drain your energy and choose one to reduce this week.',
      difficulty: 1,
      estimatedImpact: 0.5
    }
  ],
  sleep_hygiene: [
    {
      title: 'Set a sleep cutoff',
      description: () =>
        'Choose a latest screen time and sleep target for this week, then follow it for 3 nights.',
      difficulty: 1,
      estimatedImpact: 0.5
    }
  ],
  study_hours: [
    {
      title: 'Protected study block',
      description: (goal) =>
        `Schedule and complete a focused study block preparing for: ${goal.outcome}.`,
      difficulty: 2,
      estimatedImpact: 0.7
    }
  ]
};

export function generateTasksForCycle(goal, rankedGaps, options = {}) {
  const maxTasks = options.maxTasks ?? 5;
  const cycleDays = options.cycleDays ?? 7;

  const createdAt = new Date();
  const dueDate = new Date(createdAt.getTime() + cycleDays * 24 * 60 * 60 * 1000);
  const createdAtISO = createdAt.toISOString();
  const dueDateISO = dueDate.toISOString();

  const tasks = [];

  for (const gap of rankedGaps || []) {
    if (tasks.length >= maxTasks) break;
    if (!gap || gap.weightedGap <= 0) continue;
    const templates = CAPABILITY_TASK_TEMPLATES[gap.capability];
    if (!templates || templates.length === 0) continue;
    const template = templates[0];
    tasks.push({
      id: randomUUID(),
      requirementId: gap.requirementId,
      domain: gap.domain,
      capability: gap.capability,
      title: template.title,
      description: template.description(goal),
      difficulty: template.difficulty,
      estimatedImpact: template.estimatedImpact,
      dueDate: dueDateISO,
      status: 'pending',
      createdAt: createdAtISO
    });
  }

  return tasks;
}

// Backward-compatible shim for existing pipeline usage; converts raw gaps into ranked form.
export function generateTasks(gaps = [], goal = { id: '', raw: '', outcome: '', metric: '', deadline: '', type: 'event' }) {
  const ranked = (gaps || []).map((gap, idx) => ({
    requirementId: gap.requirementId || gap.id || `${gap.domain || 'req'}-${gap.capability || 'cap'}`,
    domain: gap.domain,
    capability: gap.capability,
    targetLevel: gap.targetLevel,
    currentLevel: gap.currentLevel ?? gap.currentLevel ?? 0,
    weight: gap.weight ?? 0.5,
    rawGap: gap.gap ?? gap.rawGap ?? Math.max((gap.targetLevel || 0) - (gap.currentLevel || 0), 0),
    weightedGap: gap.weightedGap ?? (gap.weight ?? 0.5) * Math.max((gap.targetLevel || 0) - (gap.currentLevel || 0), 0),
    rank: idx + 1
  }));

  const generated = generateTasksForCycle(goal, ranked, {});
  return generated.map((task, idx) => {
    const gap = ranked[idx];
    return gap
      ? {
          ...task,
          id: `habit-${gap.domain}-${gap.capability}`
        }
      : task;
  });
}
