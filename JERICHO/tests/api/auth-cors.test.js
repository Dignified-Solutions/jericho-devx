import http from 'http';
import { jest } from '@jest/globals';

async function startTestServer() {
  const { startServer } = await import('../../src/api/server.js');
  const server = startServer(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  return { server, port };
}

async function request(port, path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path,
        method,
        headers
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

describe('api auth and cors protections', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.API_TOKEN = 'secret-admin';
    process.env.API_READ_TOKEN = 'read-only';
    process.env.CORS_ALLOWLIST = 'http://allowed.test,http://localhost:5173';
  });

  afterEach(() => {
    delete process.env.API_TOKEN;
    delete process.env.API_READ_TOKEN;
    delete process.env.CORS_ALLOWLIST;
  });

  it('rejects requests without credentials', async () => {
    const { server, port } = await startTestServer();
    const res = await request(port, '/health');
    await new Promise((resolve) => server.close(resolve));

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/credentials/i);
  });

  it('returns CORS headers only for allowlisted origins', async () => {
    const { server, port } = await startTestServer();
    const res = await request(port, '/health', {
      headers: {
        Origin: 'http://allowed.test',
        Authorization: 'Bearer secret-admin'
      }
    });
    await new Promise((resolve) => server.close(resolve));

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://allowed.test');
  });

  it('blocks disallowed origins before route handling', async () => {
    const { server, port } = await startTestServer();
    const res = await request(port, '/health', {
      headers: {
        Origin: 'http://blocked.test',
        Authorization: 'Bearer secret-admin'
      }
    });
    await new Promise((resolve) => server.close(resolve));

    expect(res.status).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('enforces role-based mutation access', async () => {
    const { server, port } = await startTestServer();
    const res = await request(port, '/goals', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer read-only',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: 'restricted goal' })
    });
    await new Promise((resolve) => server.close(resolve));

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/role/i);
  });
});
