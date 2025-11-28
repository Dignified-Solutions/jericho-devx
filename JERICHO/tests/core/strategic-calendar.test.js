import { buildStrategicCalendar } from '../../src/core/strategic-calendar.js';

const goal = {
  id: 'g1',
  outcome: 'I will launch an app',
  outcomeMetric: null,
  deadline: null,
  deadlineDays: null,
  type: 'project'
};

describe('strategic-calendar', () => {
  it('basic mapping of milestones to cycles', () => {
    const milestones = [
      makeMilestone('m1', 0, 1),
      makeMilestone('m2', 2, 3),
      makeMilestone('m3', 4, 5)
    ];
    const res = buildStrategicCalendar(goal, milestones, null);
    expect(res.summary.totalCycles).toBeGreaterThanOrEqual(6);
    expect(res.cycles[0].milestones).toContain('m1');
    expect(res.cycles[2].milestones).toContain('m2');
    expect(res.cycles[4].milestones).toContain('m3');
  });

  it('overlapping milestones compute load and readiness', () => {
    const milestones = [
      makeMilestone('m1', 0, 2, 'high'),
      makeMilestone('m2', 1, 3, 'high')
    ];
    const res = buildStrategicCalendar(goal, milestones, null);
    const cycle1 = res.cycles[1];
    expect(cycle1.load.milestoneCount).toBe(2);
    expect(cycle1.readiness).toBe('heavy');
  });

  it('horizon extends by forecast', () => {
    const milestones = [makeMilestone('m1', 0, 1)];
    const forecast = { goalForecast: { cyclesToTargetOnAverage: 10 } };
    const res = buildStrategicCalendar(goal, milestones, forecast);
    expect(res.summary.totalCycles).toBeGreaterThanOrEqual(10);
  });

  it('horizon extends by deadline and clamped', () => {
    const milestones = [];
    const goalWithDeadline = { ...goal, deadlineDays: 400 };
    const res = buildStrategicCalendar(goalWithDeadline, milestones, null);
    expect(res.summary.totalCycles).toBeGreaterThanOrEqual(32);
    expect(res.summary.totalCycles).toBeLessThanOrEqual(32);
  });

  it('empty milestones yields minimum horizon and light readiness', () => {
    const res = buildStrategicCalendar(goal, [], null);
    expect(res.cycles.length).toBeGreaterThanOrEqual(4);
    res.cycles.forEach((c) => {
      expect(c.load.milestoneCount).toBe(0);
      expect(c.readiness).toBe('light');
    });
    expect(res.summary.phaseCount).toBe(0);
  });

  it('determinism and immutability', () => {
    const milestones = [makeMilestone('m1', 0, 1)];
    const goalCopy = JSON.parse(JSON.stringify(goal));
    const mileCopy = JSON.parse(JSON.stringify(milestones));
    const res1 = buildStrategicCalendar(goal, milestones, null);
    const res2 = buildStrategicCalendar(goal, milestones, null);
    expect(res1).toEqual(res2);
    expect(goal).toEqual(goalCopy);
    expect(milestones).toEqual(mileCopy);
  });
});

function makeMilestone(id, start, end, intensity = 'medium') {
  return {
    id,
    name: id,
    phaseIndex: 0,
    cycleStart: start,
    cycleEnd: end,
    requiredCapabilities: [],
    intensity
  };
}
