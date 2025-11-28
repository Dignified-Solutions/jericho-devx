import { runPipeline } from '../../src/core/pipeline.js';
import { mockGoals, mockIdentity } from '../../src/data/mock-data.js';
import { planDirectives } from '../../src/core/directive-planner.js';
import { compileSceneGraph } from '../../src/core/scene-compiler.js';

describe('ai directives route simulation', () => {
  it('returns directives and summary schema', () => {
    const state = { goals: mockGoals.goals || [], identity: mockIdentity, tasks: [], history: [] };
    const goalInput = state.goals?.length ? { goals: state.goals } : mockGoals;
    const identity = Object.keys(state.identity || {}).length ? state.identity : mockIdentity;
    const result = runPipeline(goalInput, identity, state.history || [], state.tasks || []);
    const planned = planDirectives(state, result);
    const scene = compileSceneGraph(result);
    expect(Array.isArray(planned.directives)).toBe(true);
    expect(typeof planned.summary).toBe('string');
    expect(scene.sceneVersion).toBe(1);
  });
});

