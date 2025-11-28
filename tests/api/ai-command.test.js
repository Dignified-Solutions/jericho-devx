import { interpretCommand } from '../../src/core/ai-interpreter.js';
import commandsSpec from '../../src/ai/commands-spec.json' assert { type: 'json' };
import { runPipeline } from '../../src/core/pipeline.js';
import { mockGoals, mockIdentity } from '../../src/data/mock-data.js';
import { compileSceneGraph } from '../../src/core/scene-compiler.js';

describe('ai command endpoint logic (simulated)', () => {
  it('simulates POST /ai/command create_goal response shape', () => {
    const state = { goals: [], identity: {}, tasks: [], history: [] };
    const cmd = { type: 'create_goal', payload: { text: 'Launch app by 2026-01-01' } };
    const { nextState, effects } = interpretCommand(cmd, commandsSpec, state);
    const goalInput = nextState.goals.length ? { goals: nextState.goals } : mockGoals;
    const identity = Object.keys(nextState.identity || {}).length ? nextState.identity : mockIdentity;
    const result = runPipeline(goalInput, identity, nextState.history || [], nextState.tasks || []);
    const scene = compileSceneGraph(result);

    expect(effects[0].type).toBe('goal_created');
    expect(scene.sceneVersion).toBe(1);
    expect(result.goal).toBeDefined();
  });

  it('rejects invalid command type', () => {
    const state = { goals: [], identity: {}, tasks: [], history: [] };
    const cmd = { type: 'bad_type', payload: {} };
    expect(() => interpretCommand(cmd, commandsSpec, state)).toThrow();
  });
});

