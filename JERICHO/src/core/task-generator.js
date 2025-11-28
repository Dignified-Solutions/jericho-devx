import { scoreTaskPriority } from './scoring-engine.js';

/**
 * Generate tasks from the highest gaps. Returns ordered tasks with scores.
 */
export function generateTasks(gaps) {
  return (gaps || []).flatMap((gap) => {
    if (!gap.gap) {
      return [];
    }

    const baseTasks = buildTasksForGap(gap);
    return baseTasks.map((task) => ({
      ...task,
      priority: scoreTaskPriority(task, gap),
      integrityScore: 0,
      status: 'pending'
    }));
  });
}

function buildTasksForGap(gap) {
  const tasks = [
    {
      id: `plan-${gap.domain}-${gap.capability}`,
      title: `Plan improvement for ${gap.capability}`,
      description: `Create a specific plan to reach level ${gap.targetLevel} in ${gap.capability}.`,
      domain: gap.domain,
      capability: gap.capability
    },
    {
      id: `habit-${gap.domain}-${gap.capability}`,
      title: `Daily habit: ${gap.capability}`,
      description: `Execute a daily habit to close the gap in ${gap.capability}.`,
      domain: gap.domain,
      capability: gap.capability
    }
  ];

  if (gap.gap > 2) {
    tasks.push({
      id: `mentor-${gap.domain}-${gap.capability}`,
      title: `Seek feedback on ${gap.capability}`,
      description: `Schedule coaching or feedback to accelerate growth in ${gap.capability}.`,
      domain: gap.domain,
      capability: gap.capability
    });
  }

  return tasks;
}
