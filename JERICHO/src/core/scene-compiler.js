export function compileSceneGraph(pipelineOutput = {}) {
  const integrityScore = pipelineOutput.integrity?.score ?? 0;
  const daySlots = pipelineOutput.schedule?.daySlots || [];
  const todaySlots = Array.isArray(daySlots) && daySlots.length
    ? daySlots[0].slots.map((slot, idx) => ({
        time: `slot-${idx}`,
        label: (slot.taskIds || []).join(', ') || 'Empty'
      }))
    : [];

  const forecast = pipelineOutput.analysis?.forecast || {};
  const milestones = pipelineOutput.analysis?.milestones || {};
  const governance = pipelineOutput.analysis?.cycleGovernance || {};

  return {
    sceneVersion: 1,
    panels: [
      {
        id: 'integrityGauge',
        kind: 'gauge',
        value: integrityScore,
        label: 'Integrity'
      },
      {
        id: 'todaySchedule',
        kind: 'timeline',
        items: todaySlots
      },
      {
        id: 'goalSummary',
        kind: 'card',
        title: pipelineOutput.goal?.raw || pipelineOutput.goal?.outcome || '',
        details: {
          daysRemaining: forecast.goalForecast?.cyclesToTargetOnAverage ?? null,
          nextMilestone: milestones?.[0]?.title || null
        }
      },
      {
        id: 'governanceSignals',
        kind: 'list',
        items: governance.advisories || []
      }
    ]
  };
}

export default { compileSceneGraph };
