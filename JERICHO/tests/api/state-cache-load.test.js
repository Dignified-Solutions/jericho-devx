import { createStateCache, JobQueue, computeStateSignature } from '../../src/api/state-cache.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('state cache load behavior', () => {
  it('coalesces concurrent reads for identical state signatures', async () => {
    const cache = createStateCache({ ttlMs: 50, debounceMs: 5 });
    const queue = new JobQueue();
    const state = { goals: ['g'], meta: { version: 1, hash: 'abc' } };
    const signature = computeStateSignature(state);
    let runs = 0;

    const start = Date.now();
    const results = await Promise.all(
      Array.from({ length: 6 }).map(() =>
        cache.get(
          'pipeline',
          signature,
          async () => {
            runs += 1;
            await sleep(30);
            return { source: 'pipeline', runs };
          },
          queue
        )
      )
    );
    const duration = Date.now() - start;

    expect(runs).toBe(1);
    expect(results.every((r) => r.source === 'pipeline')).toBe(true);
    expect(duration).toBeLessThan(80);
  });

  it('queues recompute work during rapid writes and serves warmed reads', async () => {
    const cache = createStateCache({ ttlMs: 250, debounceMs: 15 });
    const queue = new JobQueue();
    const base = { goals: [], meta: { version: 0, hash: 'seed' } };
    let recomputeCount = 0;

    const warmForState = (meta) => {
      const state = { ...base, meta };
      const signature = computeStateSignature(state);
      cache.invalidate();
      cache.warm(
        'session',
        signature,
        async () => {
          recomputeCount += 1;
          await sleep(25);
          return { version: meta.version };
        },
        queue
      );
      return signature;
    };

    const sig1 = warmForState({ version: 1, hash: 'h1' });
    const sig3 = warmForState({ version: 3, hash: 'h3' });

    await sleep(120);

    const final = await cache.get(
      'session',
      sig3,
      async () => ({ version: 'late' }),
      queue
    );

    expect(recomputeCount).toBe(1);
    expect(final.version).toBe(3);
    const stale = cache.get('session', sig1, async () => ({ version: 'stale' }), queue);
    await expect(stale).resolves.toEqual({ version: 'stale' });
  });
});
