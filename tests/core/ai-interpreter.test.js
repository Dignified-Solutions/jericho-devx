import { interpretCommand } from '../../src/core/ai-interpreter.js';
import commandsSpec from '../../src/ai/commands-spec.json' assert { type: 'json' };

describe('ai-interpreter', () => {
  const baseState = {
    goals: [],
    identity: { Execution: { discipline: { level: 5 } } },
    tasks: [{ id: 't1', status: 'pending' }],
    history: [],
    integrity: {}
  };

  it('creates a goal', () => {
    const cmd = { type: 'create_goal', payload: { text: 'Ship app by date' } };
    const { nextState, effects } = interpretCommand(cmd, commandsSpec, baseState);
    expect(nextState.goals.length).toBe(1);
    expect(effects[0].type).toBe('goal_created');
    expect(baseState.goals.length).toBe(0);
  });

  it('updates identity', () => {
    const cmd = { type: 'update_identity', payload: { capabilityId: 'Execution.discipline', newLevel: 7 } };
    const { nextState, effects } = interpretCommand(cmd, commandsSpec, baseState);
    expect(nextState.identity.Execution.discipline.level).toBe(7);
    expect(effects[0].type).toBe('identity_updated');
    expect(baseState.identity.Execution.discipline.level).toBe(5);
  });

  it('completes a task', () => {
    const cmd = { type: 'complete_task', payload: { taskId: 't1' } };
    const { nextState, effects } = interpretCommand(cmd, commandsSpec, baseState);
    expect(nextState.tasks.find((t) => t.id === 't1').status).toBe('completed');
    expect(effects[0].type).toBe('task_completed');
  });

  it('advances a cycle', () => {
    const cmd = { type: 'advance_cycle', payload: {} };
    const { nextState, effects } = interpretCommand(cmd, commandsSpec, baseState);
    expect(Array.isArray(nextState.history)).toBe(true);
    expect(effects[0].type).toBe('cycle_advanced');
  });

  it('rejects invalid command', () => {
    const cmd = { type: 'unknown', payload: {} };
    expect(() => interpretCommand(cmd, commandsSpec, baseState)).toThrow();
  });
});

