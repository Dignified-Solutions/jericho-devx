const DEFAULT_SLOT_CONFIG = { slotsPerDay: 4, minutesPerSlot: 60 };
const difficultyToMinutes = {
  1: 30,
  2: 60,
  3: 90
};

export function buildDaySlots(cycleStartIso, cycleEndIso, slotConfig = {}) {
  const slotsPerDay = slotConfig.slotsPerDay ?? DEFAULT_SLOT_CONFIG.slotsPerDay;
  const minutesPerSlot = slotConfig.minutesPerSlot ?? DEFAULT_SLOT_CONFIG.minutesPerSlot;

  const dates = enumerateDates(cycleStartIso, cycleEndIso);
  return dates.map((date) => ({
    date,
    slots: Array.from({ length: slotsPerDay }).map((_, idx) => ({
      index: idx,
      capacityMinutes: minutesPerSlot,
      usedMinutes: 0,
      taskIds: []
    }))
  }));
}

export function scheduleTasksIntoSlots(tasks = [], daySlots = [], integritySummary) {
  const pendingTasks = (tasks || []).filter((t) => t.status === 'pending');
  const sortedTasks = [...pendingTasks].sort(taskComparator);
  const todayDate = daySlots[0]?.date;
  const integrityFactor =
    integritySummary && integritySummary.maxPossible > 0 ? (integritySummary.score || 0) / 100 : 0;
  // Reserved for future use; Phase 1 keeps algorithm deterministic without changing capacity.
  void integrityFactor;

  let todayPriorityTaskId = null;
  const overflowTasks = [];

  for (const task of sortedTasks) {
    const durationMinutes = difficultyToMinutes[task.difficulty] ?? 60;
    const taskDueDate = normalizeDateString(task.dueDate);
    const latestDate = latestAllowedDate(taskDueDate, daySlots);

    let placed = false;

    // Power of Today: first high-impact task (>=0.7) tries today first.
    if (!todayPriorityTaskId && task.estimatedImpact >= 0.7 && todayDate) {
      placed = tryPlaceTask(task, durationMinutes, [daySlots[0]]);
      if (placed) {
        todayPriorityTaskId = task.id;
      }
    }

    if (!placed) {
      placed = tryPlaceTask(
        task,
        durationMinutes,
        daySlots.filter((day) => day.date <= latestDate && day.date >= todayDate)
      );
    }

    if (!placed) {
      overflowTasks.push(task.id);
    }
  }

  return {
    daySlots,
    overflowTasks,
    todayPriorityTaskId
  };
}

function tryPlaceTask(task, durationMinutes, days) {
  for (const day of days) {
    for (const slot of day.slots) {
      const free = slot.capacityMinutes - slot.usedMinutes;
      if (free >= durationMinutes) {
        slot.usedMinutes += durationMinutes;
        slot.taskIds.push(task.id);
        return true;
      }
    }
  }
  return false;
}

function enumerateDates(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dates = [];
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endDate = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function normalizeDateString(isoString) {
  if (!isoString) return null;
  return isoString.split('T')[0];
}

function latestAllowedDate(taskDueDate, daySlots) {
  if (!taskDueDate) return daySlots[daySlots.length - 1]?.date;
  const lastDate = daySlots[daySlots.length - 1]?.date;
  return taskDueDate && taskDueDate < lastDate ? taskDueDate : lastDate;
}

function taskComparator(a, b) {
  if (b.estimatedImpact !== a.estimatedImpact) return b.estimatedImpact - a.estimatedImpact;
  if (b.difficulty !== a.difficulty) return b.difficulty - a.difficulty;
  const aDue = a.dueDate || '';
  const bDue = b.dueDate || '';
  return aDue.localeCompare(bDue);
}
