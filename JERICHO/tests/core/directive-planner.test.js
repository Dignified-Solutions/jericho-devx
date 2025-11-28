import { planDirectives } from '../../src/core/directive-planner.js';

describe('directive-planner', () => {
  const baseState = {
    goals: ['Ship app'],
    identity: {
      Execution: { discipline: { level: 3 }, consistency: { level: 4 } }
    },
    tasks: [],
    history: []
  };

  const basePipeline = {
    tasks: [
      {
        id: 't1',
        title: 'Do today',
        estimatedImpact: 0.9,
        dueDate: '2023-12-30T00:00:00.000Z',
        status: 'pending'
      }
    ],
    schedule: {
      todayPriorityTaskId: 't1',
      cycleStart: '2023-12-31T00:00:00.000Z',
      overflowTasks: []
    },
    analysis: {
      portfolio: {
        currentMix: {
          domains: [{ domain: 'Execution', status: 'under' }]
        }
      },
      systemHealth: { health: { status: 'green', reasons: [] } },
      cycleGovernance: { mode: 'execute', flags: {}, advisories: [] }
    },
    taskBoard: { tasks: [], summary: {} }
  };

  it('creates directive for today priority task', () => {
    const { directives } = planDirectives(baseState, basePipeline);
    expect(directives.some((d) => d.reasonCode === 'TODAY_PRIORITY_TASK')).toBe(true);
  });

  it('creates directive for overdue high impact task', () => {
    const pipeline = { ...basePipeline, schedule: { ...basePipeline.schedule, cycleStart: '2024-01-05T00:00:00.000Z' } };
    const { directives } = planDirectives(baseState, pipeline);
    expect(directives.some((d) => d.reasonCode === 'OVERDUE_HIGH_IMPACT_TASK')).toBe(true);
  });

  it('creates underweight domain directive', () => {
    const { directives } = planDirectives(baseState, basePipeline);
    expect(directives.some((d) => d.reasonCode === 'UNDERWEIGHT_DOMAIN')).toBe(true);
  });

  it('creates advance cycle directive when no P1', () => {
    const pipeline = {
      ...basePipeline,
      schedule: { todayPriorityTaskId: null, cycleStart: '2024-01-01T00:00:00.000Z', overflowTasks: [] },
      tasks: []
    };
    const { directives } = planDirectives(baseState, pipeline);
    expect(directives.some((d) => d.command.type === 'advance_cycle')).toBe(true);
  });

  it('is deterministic and immutable', () => {
    const stateCopy = JSON.parse(JSON.stringify(baseState));
    const pipelineCopy = JSON.parse(JSON.stringify(basePipeline));
    const first = planDirectives(baseState, basePipeline);
    const second = planDirectives(baseState, basePipeline);
    expect(first).toEqual(second);
    expect(baseState).toEqual(stateCopy);
    expect(basePipeline).toEqual(pipelineCopy);
  });
});

