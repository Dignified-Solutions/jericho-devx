export const TASK_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  MISSED: 'missed'
};

export function completeTask(task, now, deadlineOverride) {
  const completedAt = toIso(now);
  const effectiveDeadline = deadlineOverride ?? task?.dueDate;
  const onTime = effectiveDeadline ? completedAt <= effectiveDeadline : true;

  return {
    ...task,
    status: TASK_STATUS.COMPLETED,
    completedAt,
    onTime
  };
}

export function missTask(task, now) {
  const missedAt = toIso(now);
  return {
    ...task,
    status: TASK_STATUS.MISSED,
    completedAt: undefined,
    onTime: false,
    missedAt
  };
}

export function isTaskOverdue(task, now) {
  if (!task || task.status !== TASK_STATUS.PENDING) return false;
  if (!task.dueDate) return false;
  return toIso(now) > task.dueDate;
}

export function summarizeTaskSet(tasks = []) {
  let completed = 0;
  let missed = 0;
  let pending = 0;

  for (const task of tasks) {
    if (task.status === TASK_STATUS.COMPLETED) completed += 1;
    else if (task.status === TASK_STATUS.MISSED) missed += 1;
    else pending += 1;
  }

  return {
    total: tasks.length,
    completed,
    missed,
    pending
  };
}

function toIso(value) {
  if (value instanceof Date) return value.toISOString();
  return value;
}
