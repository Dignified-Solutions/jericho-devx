/**
 * Stub for calendar/task synchronization.
 * Returns a sync request payload for downstream adapters.
 */
export function buildCalendarSyncPayload(tasks, calendarRef = 'primary') {
  return (tasks || []).map((task) => ({
    calendar: calendarRef,
    title: task.title,
    notes: task.description,
    durationMinutes: 25,
    domain: task.domain,
    capability: task.capability
  }));
}
