import { evaluateSystemHealth } from '../../src/core/meta-engine.js';

const baseIntegrity = {
  score: 80,
  completedCount: 5,
  missedCount: 0,
  pendingCount: 0,
  rawTotal: 4,
  maxPossible: 5,
  breakdown: {
    completedOnTime: 4,
    completedLate: 1,
    missed: 0,
    totalTasks: 5,
    completionRate: 1,
    onTimeRate: 0.8
  }
};

const baseSchedule = {
  daySlotsCount: 7,
  totalScheduledTasks: 5,
  totalOverflowTasks: 0
};

const baseForecast = {
  goalForecast: {
    projectedDate: null,
    cyclesToTargetOnAverage: null,
    onTrack: null
  },
  volatility: {
    integrityStdDev: 0,
    identityDeltaStdDev: 0
  },
  sustainability: {
    avgIntegrity: 80,
    avgDeltaMagnitudePerCycle: 0.5
  }
};

const baseFailure = {
  failureProfile: {
    highMissRate: false,
    highLateRate: false,
    chronicLowIntegrity: false,
    avoidanceSuspected: false
  },
  recommendations: {
    throughputAdjustment: 'hold',
    throughputFactor: 1,
    enforceCatchUpCycle: false,
    suggestCapabilityFocus: false,
    flaggedCapabilities: []
  }
};

describe('meta-engine', () => {
  it('healthy scenario', () => {
    const res = evaluateSystemHealth({
      goal: { id: 'g1' },
      history: [],
      integritySummary: baseIntegrity,
      scheduleSummary: baseSchedule,
      failureAnalysis: baseFailure,
      forecast: baseForecast
    });
    expect(res.health.status).toBe('green');
    expect(res.drift.structuralDrift).toBe(false);
    expect(res.drift.executionDrift).toBe(false);
    expect(res.governance.recommendedCycleDays).toBeGreaterThanOrEqual(5);
    expect(res.governance.recommendedMaxTasksPerCycle).toBeGreaterThan(0);
  });

  it('red scenario with chronic failure', () => {
    const integrity = { ...baseIntegrity, score: 30 };
    const failure = {
      ...baseFailure,
      failureProfile: { ...baseFailure.failureProfile, highMissRate: true, chronicLowIntegrity: true },
      recommendations: { ...baseFailure.recommendations, throughputAdjustment: 'decrease', throughputFactor: 0.5 }
    };
    const schedule = { ...baseSchedule, totalOverflowTasks: 6, totalScheduledTasks: 5 };
    const res = evaluateSystemHealth({
      goal: { id: 'g1' },
      history: [{}],
      integritySummary: integrity,
      scheduleSummary: schedule,
      failureAnalysis: failure,
      forecast: baseForecast
    });
    expect(res.health.status).toBe('red');
    expect(res.health.reasons).toEqual(expect.arrayContaining(['chronic_low_integrity', 'high_miss_rate']));
    expect(res.drift.structuralDrift).toBe(true);
    expect(res.governance.recommendedCycleDays).toBe(14);
    expect(res.governance.enforceGoalReview).toBe(true);
  });

  it('forecast past deadline triggers goal review', () => {
    const forecast = {
      ...baseForecast,
      goalForecast: { projectedDate: '2025-06-01T00:00:00.000Z', cyclesToTargetOnAverage: 5, onTrack: false }
    };
    const res = evaluateSystemHealth({
      goal: { id: 'g1' },
      history: [{}],
      integritySummary: baseIntegrity,
      scheduleSummary: baseSchedule,
      failureAnalysis: baseFailure,
      forecast
    });
    expect(res.health.reasons).toContain('forecast_past_deadline');
    expect(res.governance.enforceGoalReview).toBe(true);
  });

  it('high volatility triggers execution drift', () => {
    const forecast = {
      ...baseForecast,
      volatility: { integrityStdDev: 25, identityDeltaStdDev: 1.0 }
    };
    const res = evaluateSystemHealth({
      goal: { id: 'g1' },
      history: [{}],
      integritySummary: baseIntegrity,
      scheduleSummary: baseSchedule,
      failureAnalysis: baseFailure,
      forecast
    });
    expect(res.drift.executionDrift).toBe(true);
    expect(res.drift.notes).toContain('integrity_instability');
  });

  it('throughput adjustment passes through', () => {
    const failure = {
      ...baseFailure,
      recommendations: { ...baseFailure.recommendations, throughputAdjustment: 'decrease', throughputFactor: 0.5 }
    };
    const res = evaluateSystemHealth({
      goal: { id: 'g1' },
      history: [{}],
      integritySummary: { ...baseIntegrity, score: 30 },
      scheduleSummary: baseSchedule,
      failureAnalysis: failure,
      forecast: baseForecast
    });
    expect(res.governance.recommendedMaxTasksPerCycle).toBe(5);
  });

  it('deterministic and immutable', () => {
    const inputs = {
      goal: { id: 'g1' },
      history: [{}],
      integritySummary: baseIntegrity,
      scheduleSummary: baseSchedule,
      failureAnalysis: baseFailure,
      forecast: baseForecast
    };
    const snapshot = JSON.stringify(inputs);
    const res1 = evaluateSystemHealth(inputs);
    const res2 = evaluateSystemHealth(inputs);
    expect(res1).toEqual(res2);
    expect(JSON.stringify(inputs)).toBe(snapshot);
  });
});
