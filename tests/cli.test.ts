import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { serializeForgeConfig, parseForgeConfig, type ForgeConfig } from '../packages/core/src/index.js';
import { orchestrateProjectGeneration, writeGeneratedFiles } from '../packages/generators/src/index.js';

describe('ForgeStack Local CLI Logic (forge)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forgestack-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should scaffold project files from forge.config.yaml and support dynamic add module', async () => {
    const initialConfig: ForgeConfig = {
      version: '1.0',
      project: { name: 'cli-test', type: 'backend', packageManager: 'pnpm' },
      backend: { framework: 'express', language: 'typescript', architecture: 'modular-monolith', port: 4000 },
      database: { provider: 'postgresql', orm: 'prisma' },
      cache: { provider: 'none' },
      auth: { strategy: 'none' },
      queue: { provider: 'none' },
      observability: { logging: 'pino', metrics: 'prometheus', tracing: 'none', healthChecks: true },
      containers: { docker: true, compose: true },
      cicd: { provider: 'github-actions' },
    };

    // 1. Initial Generation
    const initialFiles = await orchestrateProjectGeneration(initialConfig);
    await writeGeneratedFiles(initialFiles, tempDir);

    const configYamlPath = path.join(tempDir, 'forge.config.yaml');
    const exists = await fs.stat(configYamlPath);
    expect(exists.isFile()).toBe(true);

    // Initial check: Redis should not exist
    const redisFilePath = path.join(tempDir, 'src/cache/redis.ts');
    let redisExists = false;
    try {
      await fs.stat(redisFilePath);
      redisExists = true;
    } catch {
      redisExists = false;
    }
    expect(redisExists).toBe(false);

    // 2. Simulate "forge add redis"
    const loadedRaw = await fs.readFile(configYamlPath, 'utf-8');
    const currentConfig = parseForgeConfig(loadedRaw);
    currentConfig.cache = { provider: 'redis' };

    await fs.writeFile(configYamlPath, serializeForgeConfig(currentConfig), 'utf-8');

    // Re-generate
    const updatedFiles = await orchestrateProjectGeneration(currentConfig);
    await writeGeneratedFiles(updatedFiles, tempDir);

    // Assert Redis file now exists
    const redisStat = await fs.stat(redisFilePath);
    expect(redisStat.isFile()).toBe(true);

    // 3. Simulate "forge add bullmq"
    currentConfig.queue = { provider: 'bullmq' };
    const queueFiles = await orchestrateProjectGeneration(currentConfig);
    await writeGeneratedFiles(queueFiles, tempDir);

    const workerPath = path.join(tempDir, 'src/queues/worker.ts');
    const workerStat = await fs.stat(workerPath);
    expect(workerStat.isFile()).toBe(true);
  });
});
