import http from 'http';
import { runPipeline } from '../core/pipeline.js';
import { mockGoals, mockIdentity } from '../data/mock-data.js';
import {
  readState,
  appendGoal,
  updateIdentity,
  recordTaskStatus,
  writeState
} from '../data/storage.js';

const port = process.env.PORT || 3000;

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
      const goalInput = state.goals?.length ? { goals: state.goals } : mockGoals;
      const identity = Object.keys(state.identity || {}).length ? state.identity : mockIdentity;
      const result = runPipeline(goalInput, identity, state.history || []);
      respondJson(res, { ...result, state });
      return;
    }

    if (req.method === 'GET' && req.url === '/state') {
      const state = await readState();
      respondJson(res, state);
      return;
    }

    if (req.method === 'POST' && req.url === '/goals') {
      const payload = await readBody(req);
      if (!payload?.domain || !payload?.capability) {
        respondJson(res, { error: 'domain and capability required' }, 400);
        return;
      }
      await appendGoal({
        domain: payload.domain,
        capability: payload.capability,
        targetLevel: Number(payload.targetLevel) || 3,
        rationale: payload.rationale || 'User submitted'
      });
      respondJson(res, { status: 'ok' });
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
