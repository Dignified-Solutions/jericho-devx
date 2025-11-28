import http from 'http';
import { createRequire } from 'module';
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
import { goalSchema, identityPatchSchema, identitySchema, taskRecordSchema, taskStatusSchema } from './validation.js';

const port = 3000;
const MAX_BODY_BYTES = 1024 * 1024; // 1MB limit
const require = createRequire(import.meta.url);
const commandsSpec = require('../ai/commands-spec.json');

export function buildServer() {
  return http.createServer(async (req, res) => {
    const corsResult = applyCors(req, res);
    if (corsResult.blocked) {
      respondJson(res, { error: corsResult.message }, 403);
      return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const auth = authenticateRequest(req, mutationRoutes);
    if (!auth.authorized) {
      respondJson(res, { error: auth.message }, auth.status || 401);
      return;
    }

    try {
      if (req.method === 'GET' && req.url === '/health') {
        respondJson(res, { status: 'alive', routes: ['/pipeline', '/state', '/goals', '/identity', '/tasks'] });
        return;
      }

    if (req.method === 'GET' && req.url === '/pipeline') {
      const state = await readState();
      const goalInput = state.goals?.length ? { goals: state.goals } : mockGoals;
      const identity = Object.keys(state.identity || {}).length ? state.identity : mockIdentity;
      const result = runPipeline(goalInput, identity, state.history || [], state.tasks || [], state.team);
      respondJson(res, { ...result, state });
      return;
    }
    if (req.method === 'GET' && req.url === '/ai/view') {
      const state = await readState();
      const goalInput = state.goals?.length ? { goals: state.goals } : mockGoals;
      const identity = Object.keys(state.identity || {}).length ? state.identity : mockIdentity;
      const result = runPipeline(goalInput, identity, state.history || [], state.tasks || [], state.team);
      const scene = compileSceneGraph(result);
      respondJson(res, { scene, raw: result });
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
      const goalInput = state.goals?.length ? { goals: state.goals } : mockGoals;
      const identity = Object.keys(state.identity || {}).length ? state.identity : mockIdentity;
      const result = runPipeline(goalInput, identity, state.history || [], state.tasks || [], state.team);
      const scene = compileSceneGraph(result);
      const directivesResult = planDirectives(state, result);
      const narrative = compileNarrative(state, result);
      const reasoning = buildReasoningStrip({
        pipeline: result,
        narrative,
        directives: directivesResult,
        scene,
        state
      });
      const chain = buildReasoningChain({
        reasoning,
        pipeline: result,
        directives: directivesResult
      });
      const multiGoal = evaluateMultiGoalPortfolio({
        state,
        analysis: { pipeline: result },
        meta: { commands: commandsSpec }
      });
      const integrityDeviations = analyzeIntegrityDeviations(
        result.history || [],
        result.integrity || {},
        result.analysis?.teamGovernance || null
      );
      const session = buildSessionSnapshot({
        state,
        pipelineOutput: result,
        scene,
        narrative,
        directives: directivesResult,
        commandSpec: commandsSpec,
        reasoning,
        chain,
        multiGoal,
        integrityDeviations
      });
      const filtered = filterSessionForViewer(session, viewerId, session.teamRoles, 'team');
      respondJson(res, { ok: true, ...filtered });
      return;
    }
    if (req.method === 'GET' && req.url === '/ai/llm-suggestions') {
      const state = await readState();
      const goalInput = state.goals?.length ? { goals: state.goals } : mockGoals;
      const identity = Object.keys(state.identity || {}).length ? state.identity : mockIdentity;
      const result = runPipeline(goalInput, identity, state.history || [], state.tasks || [], state.team);
      const scene = compileSceneGraph(result);
      const directivesResult = planDirectives(state, result);
      const narrative = compileNarrative(state, result);
      const reasoning = buildReasoningStrip({
        pipeline: result,
        narrative,
        directives: directivesResult,
        scene,
        state
      });
      const chain = buildReasoningChain({
        reasoning,
        pipeline: result,
        directives: directivesResult
      });
      const multiGoal = evaluateMultiGoalPortfolio({
        state,
        analysis: { pipeline: result },
        meta: { commands: commandsSpec }
      });
      const integrityDeviations = analyzeIntegrityDeviations(
        result.history || [],
        result.integrity || {},
        result.analysis?.teamGovernance || null
      );
      const session = buildSessionSnapshot({
        state,
        pipelineOutput: result,
        scene,
        narrative,
        directives: directivesResult,
        commandSpec: commandsSpec,
        reasoning,
        chain,
        multiGoal,
        integrityDeviations
      });
      const suggestions = await runSuggestions({ session });
      respondJson(res, { ok: true, ...suggestions });
      return;
    }

    if (req.method === 'POST' && req.url === '/ai/command') {
      const command = await parseJsonRequest(req, res);
      if (!command) return;
      try {
        const state = await readState();
        const { nextState, effects } = interpretCommand(command, commandsSpec, state);
        await writeState(nextState);
        const goalInput = nextState.goals?.length ? { goals: nextState.goals } : mockGoals;
        const identity = Object.keys(nextState.identity || {}).length ? nextState.identity : mockIdentity;
        const result = runPipeline(goalInput, identity, nextState.history || [], nextState.tasks || [], nextState.team);
        const scene = compileSceneGraph(result);
        respondJson(res, { ok: true, effects, scene, raw: result });
      } catch (err) {
        const status = err?.code === 'INVALID_COMMAND' ? 400 : 500;
        respondJson(res, { ok: false, error: err.message || 'Internal error' }, status);
      }
      return;
    }

    if (req.method === 'GET' && req.url === '/ai/narrative') {
      const state = await readState();
      const goalInput = state.goals?.length ? { goals: state.goals } : mockGoals;
      const identity = Object.keys(state.identity || {}).length ? state.identity : mockIdentity;
      const result = runPipeline(goalInput, identity, state.history || [], state.tasks || [], state.team);
      const scene = compileSceneGraph(result);
      const narrative = compileNarrative(state, result);
      respondJson(res, { narrative, scene, state });
      return;
    }

    if (req.method === 'GET' && req.url === '/ai/directives') {
      const state = await readState();
      const goalInput = state.goals?.length ? { goals: state.goals } : mockGoals;
      const identity = Object.keys(state.identity || {}).length ? state.identity : mockIdentity;
      const result = runPipeline(goalInput, identity, state.history || [], state.tasks || [], state.team);
      const directivesResult = planDirectives(state, result);
      const scene = compileSceneGraph(result);
      respondJson(res, {
        ok: true,
        directives: directivesResult.directives,
        summary: directivesResult.summary,
        scene,
        raw: result
      });
      return;
    }

    if (req.method === 'GET' && req.url === '/ai/session') {
      const state = await readState();
      const goalInput = state.goals?.length ? { goals: state.goals } : mockGoals;
      const identity = Object.keys(state.identity || {}).length ? state.identity : mockIdentity;
      const result = runPipeline(goalInput, identity, state.history || [], state.tasks || [], state.team);
      const scene = compileSceneGraph(result);
      const narrative = compileNarrative(state, result);
      const directivesResult = planDirectives(state, result);
      const reasoning = buildReasoningStrip({
        pipeline: result,
        narrative,
        directives: directivesResult,
        scene,
        state
      });
      const chain = buildReasoningChain({
        reasoning,
        pipeline: result,
        directives: directivesResult
      });
      const multiGoal = evaluateMultiGoalPortfolio({
        state,
        analysis: { pipeline: result },
        meta: { commands: commandsSpec }
      });
      const integrityDeviations = analyzeIntegrityDeviations(
        result.history || [],
        result.integrity || {},
        result.analysis?.teamGovernance || null
      );
      const timestamp = new Date().toISOString();
      const session = buildSessionSnapshot({
        state,
        pipelineOutput: result,
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
      respondJson(res, { ok: true, timestamp, session, teamHud });
      return;
    }

    if (req.method === 'GET' && req.url === '/team/export') {
      const state = await readState();
      const goalInput = state.goals?.length ? { goals: state.goals } : mockGoals;
      const identity = Object.keys(state.identity || {}).length ? state.identity : mockIdentity;
      const result = runPipeline(goalInput, identity, state.history || [], state.tasks || [], state.team);
      const scene = compileSceneGraph(result);
      const directivesResult = planDirectives(state, result);
      const narrative = compileNarrative(state, result);
      const reasoning = buildReasoningStrip({
        pipeline: result,
        narrative,
        directives: directivesResult,
        scene,
        state
      });
      const chain = buildReasoningChain({
        reasoning,
        pipeline: result,
        directives: directivesResult
      });
      const multiGoal = evaluateMultiGoalPortfolio({
        state,
        analysis: { pipeline: result },
        meta: { commands: commandsSpec }
      });
      const integrityDeviations = analyzeIntegrityDeviations(
        result.history || [],
        result.integrity || {},
        result.analysis?.teamGovernance || null
      );
      const session = buildSessionSnapshot({
        state,
        pipelineOutput: result,
        scene,
        narrative,
        directives: directivesResult,
        commandSpec: commandsSpec,
        reasoning,
        chain,
        multiGoal,
        integrityDeviations
      });
      const exportPayload = buildTeamExport(session);
      respondJson(res, { ok: true, export: exportPayload });
      return;
    }

    if (req.method === 'GET' && req.url === '/state') {
      const state = await readState();
      respondJson(res, state);
      return;
    }

    if (req.method === 'POST' && req.url === '/goals') {
      const payload = await parseJsonRequest(req, res, goalSchema);
      if (!payload) return;

      const text = payload.text.trim();
      console.log('Saving definite goal:', text);

      const updated = await appendGoal(text);

      respondJson(res, { ok: true, goals: updated.goals || [] }, 200);
      return;
    }

    if (req.method === 'POST' && req.url === '/identity') {
      const payload = await parseJsonRequest(req, res, identitySchema);
      if (!payload) return;

      await updateIdentity(payload.domain, payload.capability, payload.level);
      respondJson(res, { status: 'ok' });
      return;
    }

    if (req.method === 'PATCH' && req.url === '/identity') {
      const payload = await parseJsonRequest(req, res, identityPatchSchema);
      if (!payload) return;

      const current = await readState();
      const identity = { ...(current.identity || {}) };
      Object.entries(payload.updates).forEach(([capId, level]) => {
        if (!capId.includes('.')) return;
        const [domain, capability] = capId.split('.');
        identity[domain] = identity[domain] || {};
        identity[domain][capability] = { level };
      });
      const nextState = await writeState({ ...current, identity });
      respondJson(res, { identity: nextState.identity || {} });
      return;
    }

    if (req.method === 'POST' && req.url === '/tasks') {
      const payload = await parseJsonRequest(req, res, taskRecordSchema);
      if (!payload) return;
      await recordTaskStatus(payload.id, payload.status);
      respondJson(res, { status: 'ok' });
      return;
    }

    if (req.method === 'POST' && req.url === '/task-status') {
      const payload = await parseJsonRequest(req, res, taskStatusSchema);
      if (!payload) return;
      const updated = await recordTaskStatus(payload.taskId, payload.status);
      respondJson(res, { ok: true, state: updated });
      return;
    }

    if (req.method === 'POST' && req.url === '/cycle/next') {
      const state = await readState();
      const goalInput = state.goals?.length ? { goals: state.goals } : mockGoals;
      const identity = Object.keys(state.identity || {}).length ? state.identity : mockIdentity;
      const history = state.history || [];
      const tasks = state.tasks || [];
      const result = runPipeline(goalInput, identity, history, tasks, state?.team);
      respondJson(res, { ...result, state });
      return;
    }

    if (req.method === 'POST' && req.url === '/reset') {
      await writeState({ goals: [], identity: {}, history: [] });
      respondJson(res, { status: 'reset' });
      return;
    }

    respondJson(res, { error: 'Not found' }, 404);
  } catch (err) {
    const status = err?.statusCode || 500;
    const message = status === 500 ? 'server error' : err.message || 'Bad request';
    respondJson(res, { error: message }, status);
  }

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    process.stdout.write(`Jericho API listening on http://localhost:${port}\n`);
  });
}

export { server };

function enableCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function respondJson(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body, null, 2));
}

async function parseJsonRequest(req, res, schema) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (err) {
    if (err?.status === 413) {
      respondJson(res, { error: 'Payload too large.' }, 413);
      return null;
    }
    respondJson(res, { error: 'Invalid JSON payload.' }, 400);
    return null;
  }

  if (!schema) return payload || {};

  const parsed = schema.safeParse(payload || {});
  if (!parsed.success) {
    respondJson(
      res,
      { error: 'Invalid request body.', details: formatValidationErrors(parsed.error.issues) },
      400
    );
    return null;
  }

  return parsed.data;
}

function formatValidationErrors(issues = []) {
  return issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`);
}

async function readJsonBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    let tooLarge = false;

    req.on('data', (chunk) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > maxBytes) {
        tooLarge = true;
        const error = new Error('Request entity too large');
        error.status = 413;
        reject(error);
        return;
      }
      data += chunk;
      if (Buffer.byteLength(data) > MAX_BODY_BYTES) {
        const err = new Error('Request body too large');
        err.statusCode = 413;
        req.destroy();
        reject(err);
      }
    });

    req.on('end', () => {
      if (tooLarge) return;
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        err.status = 400;
        reject(err);
      }
    });

    req.on('aborted', () => {
      if (tooLarge) return;
      const error = new Error('Request aborted');
      error.status = 400;
      reject(error);
    });

    req.on('error', reject);
  });
}
