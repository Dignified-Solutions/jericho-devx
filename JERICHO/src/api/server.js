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
const allowedOrigins = parseAllowList(process.env.ALLOWED_ORIGINS, [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);
const readTokens = parseTokenList(
  process.env.JERICHO_API_TOKENS ||
    process.env.JERICHO_API_TOKEN ||
    process.env.API_TOKENS ||
    process.env.API_TOKEN
);
const mutationTokens = parseTokenList(
  process.env.JERICHO_MUTATION_TOKENS || process.env.JERICHO_MUTATION_TOKEN || process.env.API_MUTATION_TOKEN
);

const server = http.createServer(async (req, res) => {
  if (!applyCors(req, res, allowedOrigins)) {
    return;
  }
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

  const providedToken = extractAuthToken(req);
  if (!authenticateRequest(res, providedToken, readTokens)) {
    return;
  }

  try {
    if (req.method === 'GET' && req.url === '/health') {
      respondJson(res, { status: 'alive', routes: ['/pipeline', '/state', '/goals', '/identity', '/tasks'] });
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
      const command = await parseJsonRequest(req, res);
      if (!command) return;
      try {
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
      if (!authorizeMutation(res, providedToken, mutationTokens, readTokens)) {
        return;
      }
      const payload = await readJsonBody(req).catch(() => ({}));

      let text =
        (typeof payload.text === 'string' && payload.text) ||
        (typeof payload.goal === 'string' && payload.goal) ||
        (typeof payload.goalText === 'string' && payload.goalText) ||
        Object.values(payload).find((v) => typeof v === 'string');
      const payload = await parseJsonRequest(req, res, goalSchema);
      if (!payload) return;

      const text = payload.text.trim();
      console.log('Saving definite goal:', text);

      const updated = await appendGoal(text);
      stateCache.invalidate();
      warmAnalysis(updated, computeStateSignature(updated));
      respondJson(res, { ok: true, goals: updated.goals || [] }, 200);
      return;
    }

    if (req.method === 'POST' && req.url === '/identity') {
      if (!authorizeMutation(res, providedToken, mutationTokens, readTokens)) {
        return;
      }
      const payload = await readBody(req);
      if (!payload?.domain || !payload?.capability || payload.level === undefined) {
        respondJson(res, { error: 'domain, capability, and level required' }, 400);
        return;
      }
      const next = await updateIdentity(payload.domain, payload.capability, Number(payload.level));
      stateCache.invalidate();
      warmAnalysis(next, computeStateSignature(next));
      const payload = await parseJsonRequest(req, res, identitySchema);
      if (!payload) return;

      await updateIdentity(payload.domain, payload.capability, payload.level);
      respondJson(res, { status: 'ok' });
      return;
    }

    if (req.method === 'PATCH' && req.url === '/identity') {
      if (!authorizeMutation(res, providedToken, mutationTokens, readTokens)) {
        return;
      }
      const payload = await readJsonBody(req);
      const updates = payload?.updates;
      if (!updates || typeof updates !== 'object') {
        respondJson(res, { error: 'Identity updates are required.' }, 400);
        return;
      }
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
      stateCache.invalidate();
      warmAnalysis(nextState, computeStateSignature(nextState));
      respondJson(res, { identity: nextState.identity || {} });
      return;
    }

    if (req.method === 'POST' && req.url === '/tasks') {
      if (!authorizeMutation(res, providedToken, mutationTokens, readTokens)) {
        return;
      }
      const payload = await readBody(req);
      if (!payload?.id || !payload?.status) {
        respondJson(res, { error: 'id and status required' }, 400);
        return;
      }
      const next = await recordTaskStatus(payload.id, payload.status);
      stateCache.invalidate();
      warmAnalysis(next, computeStateSignature(next));
      const payload = await parseJsonRequest(req, res, taskRecordSchema);
      if (!payload) return;
      await recordTaskStatus(payload.id, payload.status);
      respondJson(res, { status: 'ok' });
      return;
    }

    if (req.method === 'POST' && req.url === '/task-status') {
      if (!authorizeMutation(res, providedToken, mutationTokens, readTokens)) {
        return;
      }
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
      const payload = await parseJsonRequest(req, res, taskStatusSchema);
      if (!payload) return;
      const updated = await recordTaskStatus(payload.taskId, payload.status);
      respondJson(res, { ok: true, state: updated });
      return;
    }

    if (req.method === 'POST' && req.url === '/cycle/next') {
      if (!authorizeMutation(res, providedToken, mutationTokens, readTokens)) {
        return;
      }
      const state = await readState();
      const signature = computeStateSignature(state);
      const { pipeline } = await getPipelineArtifacts(state, signature);
      respondJson(res, { ...pipeline, state });
      return;
    }

    if (req.method === 'POST' && req.url === '/reset') {
      if (!authorizeMutation(res, providedToken, mutationTokens, readTokens)) {
        return;
      }
      await writeState({ goals: [], identity: {}, history: [] });
      const resetState = await writeState({ goals: [], identity: {}, history: [] });
      stateCache.invalidate();
      warmAnalysis(resetState, computeStateSignature(resetState));
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

function applyCors(req, res, origins) {
  const origin = req.headers.origin;
  const allowedOrigins = Array.isArray(origins) ? origins.filter(Boolean) : [];

  if (origin) {
    if (!allowedOrigins.includes(origin)) {
      respondJson(res, { error: 'Origin not allowed.' }, 403);
      return false;
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  return true;
}

function parseAllowList(rawOrigins, fallback = []) {
  if (typeof rawOrigins !== 'string' || !rawOrigins.trim()) {
    return [...fallback];
  }
  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseTokenList(rawTokens) {
  if (typeof rawTokens !== 'string' || !rawTokens.trim()) {
    return [];
  }
  return rawTokens
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
}

function extractAuthToken(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string') {
    return apiKeyHeader.trim();
  }

  return '';
}

function authenticateRequest(res, providedToken, allowedTokens) {
  if (!Array.isArray(allowedTokens) || allowedTokens.length === 0) {
    respondJson(res, { error: 'Server authentication is not configured.' }, 500);
    return false;
  }

  if (!providedToken || !allowedTokens.includes(providedToken)) {
    respondJson(res, { error: 'Unauthorized.' }, 401);
    return false;
  }

  return true;
}

function authorizeMutation(res, providedToken, allowedMutationTokens, allowedReadTokens) {
  const expectedTokens = allowedMutationTokens?.length ? allowedMutationTokens : allowedReadTokens;

  if (!expectedTokens || expectedTokens.length === 0) {
    respondJson(res, { error: 'Server authorization is not configured.' }, 500);
    return false;
  }

  if (!providedToken || !expectedTokens.includes(providedToken)) {
    respondJson(res, { error: 'Forbidden.' }, 403);
    return false;
  }

  return true;
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
