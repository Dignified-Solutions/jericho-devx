import { runPipeline } from '../../src/core/pipeline.js';
import { mockGoals, mockIdentity } from '../../src/data/mock-data.js';
import { compileSceneGraph } from '../../src/core/scene-compiler.js';
import { compileNarrative } from '../../src/core/narrative-compiler.js';
import { planDirectives } from '../../src/core/directive-planner.js';
import { buildReasoningStrip } from '../../src/core/reasoning-strip.js';
import { buildSessionSnapshot } from '../../src/core/ai-session.js';
import commandsSpec from '../../src/ai/commands-spec.json' assert { type: 'json' };

describe('ai session simulation', () => {
  it('builds session snapshot with reasoning', () => {
    const state = { goals: mockGoals.goals || [], identity: mockIdentity, tasks: [], history: [] };
    const goalInput = state.goals?.length ? { goals: state.goals } : mockGoals;
    const identity = Object.keys(state.identity || {}).length ? state.identity : mockIdentity;
    const result = runPipeline(goalInput, identity, state.history || [], state.tasks || []);
    const scene = compileSceneGraph(result);
    const narrative = compileNarrative(state, result);
    const directives = planDirectives(state, result);
    const reasoning = buildReasoningStrip({ pipeline: result, narrative, directives, scene, state });
    const session = buildSessionSnapshot({
      state,
      pipelineOutput: result,
      scene,
      narrative,
      directives,
      commandSpec: commandsSpec,
      reasoning
    });
    expect(session.version).toBeDefined();
    expect(session.analysis.reasoning).toEqual(reasoning);
    expect(session.meta.commands).toEqual(commandsSpec);
  });
});

