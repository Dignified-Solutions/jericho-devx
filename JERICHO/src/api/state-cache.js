import crypto from 'crypto';

const DEFAULT_TTL_MS = Number(process.env.STATE_CACHE_TTL_MS || 1500);
const DEFAULT_DEBOUNCE_MS = Number(process.env.STATE_CACHE_DEBOUNCE_MS || 75);

export function computeStateSignature(state = {}) {
  const baseVersion = Number.isFinite(state?.meta?.version) ? Number(state.meta.version) : 0;
  const hash =
    typeof state?.meta?.hash === 'string' && state.meta.hash
      ? state.meta.hash
      : crypto
          .createHash('sha256')
          .update(
            JSON.stringify({
              goals: state.goals,
              identity: state.identity,
              history: state.history,
              tasks: state.tasks,
              integrity: state.integrity,
              team: state.team
            })
          )
          .digest('hex');
  return `${baseVersion}:${hash}`;
}

class TimedCache {
  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
    this.cache = new Map();
    this.pending = new Map();
  }

  async get(key, compute, queue) {
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) {
      return hit.value;
    }

    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    const runner = async () => {
      const value = queue ? await queue.enqueue(compute) : await compute();
      this.cache.set(key, { value, expiresAt: now + this.ttlMs });
      this.pending.delete(key);
      return value;
    };

    const promise = runner();
    this.pending.set(key, promise);
    return promise;
  }

  invalidate(matcher = () => true) {
    [...this.cache.keys()].forEach((cacheKey) => {
      if (matcher(cacheKey)) this.cache.delete(cacheKey);
    });
    [...this.pending.keys()].forEach((pendingKey) => {
      if (matcher(pendingKey)) this.pending.delete(pendingKey);
    });
  }
}

export class JobQueue {
  constructor() {
    this.tail = Promise.resolve();
  }

  enqueue(task) {
    const run = async () => task();
    const next = this.tail.then(run, run);
    this.tail = next.catch((err) => {
      // Keep the queue alive while surfacing the error to the caller.
      console.error('[JobQueue] task failure', err);
    });
    return next;
  }
}

export function createStateCache({ ttlMs = DEFAULT_TTL_MS, debounceMs = DEFAULT_DEBOUNCE_MS } = {}) {
  const timedCache = new TimedCache(ttlMs);
  const warmTimers = new Map();

  const compositeKey = (label, signature) => `${label}:${signature}`;

  return {
    signatureFor: computeStateSignature,
    async get(label, signature, compute, queue) {
      const key = compositeKey(label, signature);
      return timedCache.get(key, compute, queue);
    },
    warm(label, signature, compute, queue) {
      const key = compositeKey(label, signature);
      if (warmTimers.has(key)) {
        clearTimeout(warmTimers.get(key));
      }
      const timer = setTimeout(() => {
        warmTimers.delete(key);
        timedCache.get(key, compute, queue).catch(() => {
          /* errors surfaced via queue */
        });
      }, debounceMs);
      warmTimers.set(key, timer);
    },
    invalidate(signature) {
      if (signature) {
        timedCache.invalidate((k) => k.endsWith(`:${signature}`));
        warmTimers.forEach((timer, key) => {
          if (key.endsWith(`:${signature}`)) {
            clearTimeout(timer);
            warmTimers.delete(key);
          }
        });
        return;
      }
      timedCache.invalidate(() => true);
      warmTimers.forEach((timer, key) => {
        clearTimeout(timer);
        warmTimers.delete(key);
      });
    }
  };
}
