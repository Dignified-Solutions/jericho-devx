import http from 'http';
import { runPipeline } from '../core/pipeline.js';
import { mockGoals, mockIdentity } from '../data/mock-data.js';
import { readState, appendGoal, updateIdentity, recordTaskStatus, writeState } from '../data/storage.js';
import { compileSceneGraph } from '../core/scene-compiler.js';
import { interpretCommand } from '../core/ai-interpreter.js';
import { planDirectives } from '../core/directive-planner.js';
import { compileNarrative } from '../core/narrative-compiler.js';
import { buildReasoningStrip } from '../core/reasoning-strip.js';
import { buildReasoningChain } from '../core/reasoning-chain.js';
import { evaluateMultiGoalPortfolio } from '../core/multi-goal-evaluator.js';
import { analyzeIntegrityDeviations } from '../core/integrity-deviation-engine.js';
import { buildSessionSnapshot } from '../core/ai-session.js';
import { buildTeamHud, buildTeamExport } from '../core/team-hud.js';
import { filterSessionForViewer } from '../core/team-roles.js';
import { getLLMContract } from '../ai/llm-contract.js';
import { runSuggestions } from '../llm/suggestion-runner.js';
import commandsSpec from '../ai/commands-spec.json' assert { type: 'json' };
import { computeStateSignature, createStateCache, JobQueue } from './state-cache.js';

const port = 3000;
const stateCache = createStateCache();
const analysisQueue = new JobQueue();

const server = http.createServer(async (req, res) => {
  enableCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' && req.url === '/health') {
      respondJson(res, { status: 'alive', routes: ['/pipeline', '/state', '/goals', '/identity', '/tasks'] });
      return;
    }

    if (req.method === 'GET' && req.url === '/pipeline') {
      const state = await readState();
      const signature = computeStateSignature(state);
      const { pipeline } = await getPipelineArtifacts(state, signature);
      respondJson(res, { ...pipeline, state });
      return;
    }
    if (req.method === 'GET' && req.url === '/ai/view') {
      const state = await readState();
      const signature = computeStateSignature(state);
      const { pipeline, scene } = await getPipelineArtifacts(state, signature);
      respondJson(res, { scene, raw: pipeline });
      return;
    }
    if (req.method === 'GET' && req.url === '/ai/llm-contract') {
      const contract = getLLMContract();
      respondJson(res, { version: contract.version, updatedAt: contract.updatedAt, contract });
      return;
    }
    if (req.method === 'GET' && req.url.startsWith('/ai/session/view')) {
      const url = new URL(req.url, 'http://localhost');
      const viewerId = url.searchParams.get('viewerId');
      const state = await readState();
      const signature = computeStateSignature(state);
      const { session, pipeline, scene, directivesResult, narrative, reasoning, chain, multiGoal, integrityDeviations } =
        await getSessionArtifacts(state, signature);
      const filtered = filterSessionForViewer(session, viewerId, session.teamRoles, 'team');
      respondJson(res, { ok: true, ...filtered });
      return;
    }
    if (req.method === 'GET' && req.url === '/ai/llm-suggestions') {
      const state = await readState();
      const signature = computeStateSignature(state);
      const { session } = await getSessionArtifacts(state, signature);
      const suggestions = await runSuggestions({ session });
      respondJson(res, { ok: true, ...suggestions });
      return;
    }

    if (req.method === 'POST' && req.url === '/ai/command') {
      try {
        const command = await readJsonBody(req);
        const state = await readState();
        const { nextState, effects } = interpretCommand(command, commandsSpec, state);
        const persisted = await writeState(nextState);
        const signature = computeStateSignature(persisted);
        stateCache.invalidate();
        warmAnalysis(persisted, signature);
        const { pipeline, scene } = await getPipelineArtifacts(persisted, signature);
        respondJson(res, { ok: true, effects, scene, raw: pipeline });
      } catch (err) {
        const status = err?.code === 'INVALID_COMMAND' ? 400 : 500;
        respondJson(res, { ok: false, error: err.message || 'Internal error' }, status);
      }
      return;
    }

    if (req.method === 'GET' && req.url === '/ai/narrative') {
      const state = await readState();
      const signature = computeStateSignature(state);
      const { pipeline, scene, narrative } = await getSessionArtifacts(state, signature);
      respondJson(res, { narrative, scene, state, raw: pipeline });
      return;
    }

    if (req.method === 'GET' && req.url === '/ai/directives') {
      const state = await readState();
      const signature = computeStateSignature(state);
      const { pipeline, directivesResult, scene } = await getSessionArtifacts(state, signature);
      respondJson(res, {
        ok: true,
        directives: directivesResult.directives,
        summary: directivesResult.summary,
        scene,
        raw: pipeline
      });
      return;
    }

    if (req.method === 'GET' && req.url === '/ai/session') {
      const state = await readState();
      const signature = computeStateSignature(state);
      const { session, teamHud } = await getSessionArtifacts(state, signature);
      const timestamp = new Date().toISOString();
      respondJson(res, { ok: true, timestamp, session, teamHud });
      return;
    }

    if (req.method === 'GET' && req.url === '/team/export') {
      const state = await readState();
      const signature = computeStateSignature(state);
      const { exportPayload } = await getSessionArtifacts(state, signature);
      respondJson(res, { ok: true, export: exportPayload });
      return;
    }

    if (req.method === 'GET' && req.url === '/state') {
      const state = await readState();
      respondJson(res, state);
      return;
    }

    if (req.method === 'POST' && req.url === '/goals') {
      const payload = await readJsonBody(req).catch(() => ({}));

      let text =
        (typeof payload.text === 'string' && payload.text) ||
        (typeof payload.goal === 'string' && payload.goal) ||
        (typeof payload.goalText === 'string' && payload.goalText) ||
        Object.values(payload).find((v) => typeof v === 'string');

      if (!text || !text.trim()) {
        respondJson(res, { error: 'Goal text is required.' }, 400);
        return;
      }

      text = text.trim();
      console.log('Saving definite goal:', text);

      const updated = await appendGoal(text);
      stateCache.invalidate();
      warmAnalysis(updated, computeStateSignature(updated));
      respondJson(res, { ok: true, goals: updated.goals || [] }, 200);
      return;
    }

    if (req.method === 'POST' && req.url === '/identity') {
      const payload = await readBody(req);
      if (!payload?.domain || !payload?.capability || payload.level === undefined) {
        respondJson(res, { error: 'domain, capability, and level required' }, 400);
        return;
      }
      const next = await updateIdentity(payload.domain, payload.capability, Number(payload.level));
      stateCache.invalidate();
      warmAnalysis(next, computeStateSignature(next));
      respondJson(res, { status: 'ok' });
      return;
    }

    if (req.method === 'PATCH' && req.url === '/identity') {
      const payload = await readJsonBody(req);
      const updates = payload?.updates;
      if (!updates || typeof updates !== 'object') {
        respondJson(res, { error: 'Identity updates are required.' }, 400);
        return;
      }
      const current = await readState();
      const identity = { ...(current.identity || {}) };
      Object.entries(updates).forEach(([capId, value]) => {
        const level = Number(value);
        if (!Number.isFinite(level)) return;
        if (capId.includes('.')) {
          const [domain, capability] = capId.split('.');
          identity[domain] = identity[domain] || {};
          identity[domain][capability] = { level };
        }
      });
      const nextState = await writeState({ ...current, identity });
      stateCache.invalidate();
      warmAnalysis(nextState, computeStateSignature(nextState));
      respondJson(res, { identity: nextState.identity || {} });
      return;
    }

    if (req.method === 'POST' && req.url === '/tasks') {
      const payload = await readBody(req);
      if (!payload?.id || !payload?.status) {
        respondJson(res, { error: 'id and status required' }, 400);
        return;
      }
      const next = await recordTaskStatus(payload.id, payload.status);
      stateCache.invalidate();
      warmAnalysis(next, computeStateSignature(next));
      respondJson(res, { status: 'ok' });
      return;
    }

    if (req.method === 'POST' && req.url === '/task-status') {
      const payload = await readJsonBody(req);
      const { taskId, status } = payload || {};
      if (!taskId || typeof taskId !== 'string') {
        respondJson(res, { error: 'taskId is required.' }, 400);
        return;
      }
      if (!['completed', 'missed'].includes(status)) {
        respondJson(res, { error: 'Invalid status.' }, 400);
        return;
      }
      const updated = await recordTaskStatus(taskId, status);
      stateCache.invalidate();
      warmAnalysis(updated, computeStateSignature(updated));
      respondJson(res, { ok: true, state: updated });
      return;
    }

    if (req.method === 'POST' && req.url === '/cycle/next') {
      const state = await readState();
      const signature = computeStateSignature(state);
      const { pipeline } = await getPipelineArtifacts(state, signature);
      respondJson(res, { ...pipeline, state });
      return;
    }

    if (req.method === 'POST' && req.url === '/reset') {
      const resetState = await writeState({ goals: [], identity: {}, history: [] });
      stateCache.invalidate();
      warmAnalysis(resetState, computeStateSignature(resetState));
      respondJson(res, { status: 'reset' });
      return;
    }

    respondJson(res, { error: 'Not found' }, 404);
  } catch (err) {
    respondJson(res, { error: err.message || 'server error' }, 500);
  }
});

server.listen(port, () => {
  process.stdout.write(`Jericho API listening on http://localhost:${port}\n`);
});

function enableCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function respondJson(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body, null, 2));
}

async function getPipelineArtifacts(state, signature) {
  return stateCache.get(
    'pipeline',
    signature,
    () => buildPipelineArtifacts(state),
    analysisQueue
  );
}

async function getSessionArtifacts(state, signature) {
  return stateCache.get(
    'session',
    signature,
    () => buildSessionArtifacts(state, signature),
    analysisQueue
  );
}

function warmAnalysis(state, signature) {
  stateCache.warm('pipeline', signature, () => buildPipelineArtifacts(state), analysisQueue);
  stateCache.warm('session', signature, () => buildSessionArtifacts(state, signature), analysisQueue);
}

async function buildPipelineArtifacts(state) {
  const goalInput = state.goals?.length ? { goals: state.goals } : mockGoals;
  const identity = Object.keys(state.identity || {}).length ? state.identity : mockIdentity;
  const pipeline = runPipeline(goalInput, identity, state.history || [], state.tasks || [], state.team);
  const scene = compileSceneGraph(pipeline);
  return { pipeline, scene, goalInput, identity };
}

async function buildSessionArtifacts(state, signature) {
  const { pipeline, scene } = await getPipelineArtifacts(state, signature);
  const directivesResult = planDirectives(state, pipeline);
  const narrative = compileNarrative(state, pipeline);
  const reasoning = buildReasoningStrip({
    pipeline,
    narrative,
    directives: directivesResult,
    scene,
    state
  });
  const chain = buildReasoningChain({
    reasoning,
    pipeline,
    directives: directivesResult
  });
  const multiGoal = evaluateMultiGoalPortfolio({
    state,
    analysis: { pipeline },
    meta: { commands: commandsSpec }
  });
  const integrityDeviations = analyzeIntegrityDeviations(
    pipeline.history || [],
    pipeline.integrity || {},
    pipeline.analysis?.teamGovernance || null
  );
  const session = buildSessionSnapshot({
    state,
    pipelineOutput: pipeline,
    scene,
    narrative,
    directives: directivesResult,
    commandSpec: commandsSpec,
    reasoning,
    chain,
    multiGoal,
    integrityDeviations
  });
  const teamHud = buildTeamHud(session);
  const exportPayload = buildTeamExport(session);
  return {
    pipeline,
    scene,
    directivesResult,
    narrative,
    reasoning,
    chain,
    multiGoal,
    integrityDeviations,
    session,
    teamHud,
    exportPayload
  };
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}
