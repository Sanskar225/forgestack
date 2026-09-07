import type { ForgeConfig } from '@sanskar22/core';
import type { GeneratedFile } from '../types.js';

export function generateCacheFiles(config: ForgeConfig, basePath: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const { cache, queue } = config;

  const needsRedis = cache?.provider === 'redis' || cache?.provider === 'elasticache' || queue?.provider === 'bullmq';

  if (!needsRedis) {
    return files;
  }

  const redisTs = `import { Redis } from 'ioredis';
import { logger } from '../observability/logger.js';

const host = process.env.REDIS_HOST || 'localhost';
const port = Number(process.env.REDIS_PORT || 6379);
const password = process.env.REDIS_PASSWORD || undefined;

export const redis = new Redis({
  host,
  port,
  password,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info({ host, port }, 'Redis connection established');
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Redis connection');
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    const val = await redis.get(key);
    if (!val) return null;
    try {
      return JSON.parse(val) as T;
    } catch {
      return val as unknown as T;
    }
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await redis.set(key, stringValue, 'EX', ttlSeconds);
    } else {
      await redis.set(key, stringValue);
    }
  },

  async del(key: string): Promise<void> {
    await redis.del(key);
  },
};
`;

  files.push({
    path: `${basePath}/src/cache/redis.ts`,
    content: redisTs,
  });

  return files;
}
