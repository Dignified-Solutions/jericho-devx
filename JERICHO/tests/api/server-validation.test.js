import fs from 'fs/promises';
import os from 'os';
import path from 'path';

describe('api server validation', () => {
  let listener;
  let baseUrl;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jericho-api-'));
    process.env.STATE_PATH = path.join(tempDir, 'state.json');

    const mod = await import('../../src/api/server.js');
    listener = mod.server.listen(0);
    await new Promise((resolve) => listener.once('listening', resolve));
    const address = listener.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (listener) {
      await new Promise((resolve) => listener.close(resolve));
    }
  });

  it('returns 413 for oversized bodies', async () => {
    const payload = { text: 'a'.repeat(1_050_000) };
    const res = await fetch(`${baseUrl}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(413);
  });

  it('returns 400 for invalid JSON', async () => {
    const res = await fetch(`${baseUrl}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{'
    });

    expect(res.status).toBe(400);
  });

  it('validates required goal text', async () => {
    const res = await fetch(`${baseUrl}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    expect(res.status).toBe(400);
  });

  it('validates identity updates', async () => {
    const res = await fetch(`${baseUrl}/identity`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: { 'team.collaboration': 'not-a-number' } })
    });

    expect(res.status).toBe(400);
  });

  it('validates task status payload', async () => {
    const res = await fetch(`${baseUrl}/task-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 'task-1', status: 'started' })
    });

    expect(res.status).toBe(400);
  });
});
