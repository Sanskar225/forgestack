import { describe, it, expect } from 'vitest';
import {
  parseForgeConfig,
  validateForgeConfig,
  autoFixForgeConfig,
  resolveBackendDependencies,
  resolveFrontendDependencies,
  renderAsciiArchitecture,
  generateMermaidDiagram,
  type ForgeConfig,
} from '../packages/core/src/index.js';

describe('ForgeStack Architecture Engine (@forgestack/core)', () => {
  it('should parse and validate a valid Fullstack SaaS configuration', () => {
    const yamlConfig = `
version: "1.0"
project:
  name: "saas-app"
  type: "fullstack"
  packageManager: "pnpm"

frontend:
  framework: "nextjs"
  language: "typescript"
  styling: "tailwind"
  state: "zustand"

backend:
  framework: "express"
  language: "typescript"
  architecture: "modular-monolith"
  port: 4000

database:
  provider: "postgresql"
  orm: "prisma"

cache:
  provider: "redis"

auth:
  strategy: "jwt"

queue:
  provider: "bullmq"

infrastructure:
  cloud: "aws"
  aws:
    compute: "ecs"
    database: "rds"
    storage:
      - "s3"
    cache: "elasticache"
    networking:
      - "vpc"
      - "alb"
  iac: "terraform"

observability:
  logging: "pino"
  metrics: "prometheus"
  tracing: "opentelemetry"
  healthChecks: true

containers:
  docker: true
  compose: true

cicd:
  provider: "github-actions"
`;

    const config = parseForgeConfig(yamlConfig);
    expect(config.project.name).toBe('saas-app');
    expect(config.project.type).toBe('fullstack');

    const validation = validateForgeConfig(config);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect architecture conflict: BullMQ without Redis', () => {
    const badConfig: ForgeConfig = {
      version: '1.0',
      project: { name: 'test-app', type: 'backend', packageManager: 'pnpm' },
      backend: { framework: 'express', language: 'typescript', architecture: 'modular-monolith', port: 4000 },
      cache: { provider: 'none' },
      queue: { provider: 'bullmq' },
    };

    const result = validateForgeConfig(badConfig);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'ERR_BULLMQ_NO_REDIS')).toBe(true);

    const fixed = autoFixForgeConfig(badConfig);
    expect(fixed.cache?.provider).toBe('redis');
    const fixedResult = validateForgeConfig(fixed);
    expect(fixedResult.valid).toBe(true);
  });

  it('should detect database and ORM mismatch: Mongoose on PostgreSQL', () => {
    const mismatchConfig: ForgeConfig = {
      version: '1.0',
      project: { name: 'test-app', type: 'backend', packageManager: 'pnpm' },
      backend: { framework: 'express', language: 'typescript', architecture: 'modular-monolith', port: 4000 },
      database: { provider: 'postgresql', orm: 'mongoose' },
    };

    const result = validateForgeConfig(mismatchConfig);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'ERR_MONGOOSE_DB_MISMATCH')).toBe(true);
  });

  it('should warn on AWS Lambda + BullMQ architectural anti-pattern', () => {
    const lambdaBullMQ: ForgeConfig = {
      version: '1.0',
      project: { name: 'test-app', type: 'backend', packageManager: 'pnpm' },
      backend: { framework: 'express', language: 'typescript', architecture: 'modular-monolith', port: 4000 },
      cache: { provider: 'redis' },
      queue: { provider: 'bullmq' },
      infrastructure: {
        cloud: 'aws',
        aws: { compute: 'lambda' },
        iac: 'terraform',
      },
    };

    const result = validateForgeConfig(lambdaBullMQ);
    expect(result.warnings.some((w) => w.code === 'WARN_LAMBDA_BULLMQ_MISMATCH')).toBe(true);
  });

  it('should compute zero-bloat dependencies', () => {
    const minimalConfig: ForgeConfig = {
      version: '1.0',
      project: { name: 'minimal', type: 'backend', packageManager: 'pnpm' },
      backend: { framework: 'fastify', language: 'typescript', architecture: 'modular-monolith', port: 3000 },
      database: { provider: 'none', orm: 'none' },
      cache: { provider: 'none' },
      auth: { strategy: 'none' },
      queue: { provider: 'none' },
      observability: { logging: 'pino', metrics: 'none', tracing: 'none', healthChecks: true },
    };

    const manifest = resolveBackendDependencies(minimalConfig);
    expect(manifest.dependencies['fastify']).toBeDefined();
    expect(manifest.dependencies['ioredis']).toBeUndefined();
    expect(manifest.dependencies['bullmq']).toBeUndefined();
    expect(manifest.dependencies['jsonwebtoken']).toBeUndefined();
    expect(manifest.dependencies['@prisma/client']).toBeUndefined();
  });

  it('should generate ASCII and Mermaid architecture diagrams without errors', () => {
    const config: ForgeConfig = {
      version: '1.0',
      project: { name: 'visual-app', type: 'fullstack', packageManager: 'pnpm' },
      frontend: { framework: 'nextjs', language: 'typescript', styling: 'tailwind' },
      backend: { framework: 'express', language: 'typescript', architecture: 'modular-monolith', port: 4000 },
      database: { provider: 'postgresql', orm: 'prisma' },
      cache: { provider: 'redis' },
      queue: { provider: 'bullmq' },
      infrastructure: { cloud: 'aws', aws: { compute: 'ecs', networking: ['alb', 'cloudfront'] }, iac: 'terraform' },
      observability: { logging: 'pino', metrics: 'prometheus', tracing: 'opentelemetry', healthChecks: true },
    };

    const ascii = renderAsciiArchitecture(config);
    expect(ascii).toContain('visual-app');
    expect(ascii).toContain('Frontend: nextjs (tailwind)');
    expect(ascii).toContain('BullMQ Worker Process');

    const mermaid = generateMermaidDiagram(config);
    expect(mermaid).toContain('flowchart TD');
    expect(mermaid).toContain('BullMQ Worker');
  });
});
