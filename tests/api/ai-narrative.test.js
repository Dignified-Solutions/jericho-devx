import { runPipeline } from '../../src/core/pipeline.js';
import { mockGoals, mockIdentity } from '../../src/data/mock-data.js';
import { compileNarrative } from '../../src/core/narrative-compiler.js';
import { compileSceneGraph } from '../../src/core/scene-compiler.js';

describe('ai narrative route simulation', () => {
  it('produces narrative and scene schema', () => {
    const state = { goals: mockGoals.goals || [], identity: mockIdentity, tasks: [], history: [] };
    const goalInput = state.goals?.length ? { goals: state.goals } : mockGoals;
    const identity = Object.keys(state.identity || {}).length ? state.identity : mockIdentity;
    const result = runPipeline(goalInput, identity, state.history || [], state.tasks || []);
    const narrative = compileNarrative(state, result);
    const scene = compileSceneGraph(result);
    expect(narrative.summary).toBeDefined();
    expect(scene.sceneVersion).toBe(1);
    expect(Array.isArray(narrative.identityNarrative)).toBe(true);
  });
});

