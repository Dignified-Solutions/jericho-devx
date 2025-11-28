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
import commandsSpec from '../ai/commands-spec.json' with { type: 'json' };

const port = 3000;
const mutationRoutes = new Set(['/goals', '/identity', '/tasks', '/reset', '/cycle/next', '/task-status']);

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
      try {
        const command = await readJsonBody(req);
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

      respondJson(res, { ok: true, goals: updated.goals || [] }, 200);
      return;
    }

    if (req.method === 'POST' && req.url === '/identity') {
      const payload = await readBody(req);
      if (!payload?.domain || !payload?.capability || payload.level === undefined) {
        respondJson(res, { error: 'domain, capability, and level required' }, 400);
        return;
      }
      await updateIdentity(payload.domain, payload.capability, Number(payload.level));
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
      respondJson(res, { identity: nextState.identity || {} });
      return;
    }

    if (req.method === 'POST' && req.url === '/tasks') {
      const payload = await readBody(req);
      if (!payload?.id || !payload?.status) {
        respondJson(res, { error: 'id and status required' }, 400);
        return;
      }
      await recordTaskStatus(payload.id, payload.status);
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
      respondJson(res, { error: err.message || 'server error' }, 500);
    }
  });
}

export function startServer(listenPort = port) {
  const server = buildServer();
  server.listen(listenPort, () => {
    process.stdout.write(`Jericho API listening on http://localhost:${listenPort}\n`);
  });
  return server;
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

function applyCors(req, res) {
  const allowlist = getCorsAllowlist();
  const origin = req.headers?.origin;
  const host = req.headers?.host;
  const allowedOrigin = selectAllowedOrigin(origin, host, allowlist);

  if (origin && !allowedOrigin) {
    return { blocked: true, message: 'Origin not allowed' };
  }

  if (!allowedOrigin) {
    return { blocked: false, message: 'No matching origin' };
  }

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-API-Key');
  return { blocked: false, message: 'ok', origin: allowedOrigin };
}

function respondJson(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body, null, 2));
}

function authenticateRequest(req, mutationSet) {
  const configuredTokens = getConfiguredTokens();
  if (!configuredTokens.length) {
    return { authorized: false, status: 401, message: 'API auth token not configured' };
  }

  const token = extractToken(req);
  if (!token) {
    return { authorized: false, status: 401, message: 'Missing API credentials' };
  }

  const match = configuredTokens.find((entry) => entry.token === token);
  if (!match) {
    return { authorized: false, status: 401, message: 'Unauthorized' };
  }

  const url = new URL(req.url, 'http://localhost');
  const isMutation = mutationSet.has(url.pathname) && req.method !== 'GET';
  const canMutate = ['admin', 'mutation', 'write'].includes(match.role);

  if (isMutation && !canMutate) {
    return { authorized: false, status: 403, message: 'Insufficient role for mutation route' };
  }

  return { authorized: true, role: match.role };
}

function extractToken(req) {
  const authHeader = req.headers?.authorization;
  const apiKeyHeader = req.headers?.['x-api-key'];

  if (typeof apiKeyHeader === 'string' && apiKeyHeader.trim()) {
    return apiKeyHeader.trim();
  }

  if (typeof authHeader === 'string') {
    const normalized = authHeader.trim();
    if (normalized.toLowerCase().startsWith('bearer ')) {
      return normalized.slice(7).trim();
    }
    if (normalized.toLowerCase().startsWith('api-key ')) {
      return normalized.slice(8).trim();
    }
    if (!normalized.includes(' ')) {
      return normalized;
    }
  }

  return null;
}

function getConfiguredTokens() {
  const entries = [
    { token: process.env.API_TOKEN, role: 'admin' },
    { token: process.env.API_KEY, role: 'admin' },
    { token: process.env.API_MUTATION_TOKEN, role: 'mutation' },
    { token: process.env.API_WRITE_TOKEN, role: 'mutation' },
    { token: process.env.API_READ_TOKEN, role: 'read' }
  ];

  return entries
    .filter((entry) => typeof entry.token === 'string' && entry.token.trim())
    .map((entry) => ({ ...entry, token: entry.token.trim() }));
}

function getCorsAllowlist() {
  const raw = process.env.CORS_ALLOWLIST || 'http://localhost:5173,http://127.0.0.1:5173';
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectAllowedOrigin(originHeader, hostHeader, allowlist) {
  const normalizedAllowlist = allowlist
    .map((entry) => {
      try {
        return new URL(entry).origin;
      } catch (err) {
        return null;
      }
    })
    .filter(Boolean);

  if (originHeader) {
    return normalizedAllowlist.includes(originHeader) ? originHeader : null;
  }

  const hostName = (hostHeader || '').split(':')[0];
  if (!hostName) return null;

  const hostAllowedOrigin = normalizedAllowlist.find((entry) => {
    try {
      return new URL(entry).hostname === hostName;
    } catch (err) {
      return false;
    }
  });

  return hostAllowedOrigin || null;
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
