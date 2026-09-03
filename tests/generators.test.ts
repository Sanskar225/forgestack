import { describe, it, expect } from 'vitest';
import { orchestrateProjectGeneration, type GeneratedFile } from '../packages/generators/src/index.js';
import type { ForgeConfig } from '../packages/core/src/index.js';

describe('ForgeStack Code & Infra Generators (@forgestack/generators)', () => {
  it('should generate fullstack SaaS application files', async () => {
    const config: ForgeConfig = {
      version: '1.0',
      project: { name: 'cloud-saas', type: 'fullstack', packageManager: 'pnpm' },
      frontend: { framework: 'nextjs', language: 'typescript', styling: 'tailwind' },
      backend: { framework: 'express', language: 'typescript', architecture: 'modular-monolith', port: 4000 },
      database: { provider: 'postgresql', orm: 'prisma' },
      cache: { provider: 'redis' },
      auth: { strategy: 'jwt', features: ['refresh-tokens', 'rate-limiting'] },
      queue: { provider: 'bullmq' },
      infrastructure: {
        cloud: 'aws',
        aws: { compute: 'ecs', database: 'rds', storage: ['s3'], cache: 'elasticache', networking: ['vpc', 'alb'] },
        iac: 'terraform',
      },
      observability: { logging: 'pino', metrics: 'prometheus', tracing: 'opentelemetry', healthChecks: true },
      containers: { docker: true, compose: true },
      cicd: { provider: 'github-actions' },
    };

    const files = await orchestrateProjectGeneration(config);
    expect(files.length).toBeGreaterThan(15);

    const filePaths = files.map((f) => f.path);
    expect(filePaths).toContain('package.json');
    expect(filePaths).toContain('forge.config.yaml');
    expect(filePaths).toContain('ARCHITECTURE.md');
    expect(filePaths).toContain('architecture.mmd');
    expect(filePaths).toContain('docker-compose.yml');
    expect(filePaths).toContain('apps/api/package.json');
    expect(filePaths).toContain('apps/api/src/index.ts');
    expect(filePaths).toContain('apps/api/src/app.ts');
    expect(filePaths).toContain('apps/api/src/modules/health/health.service.ts');
    expect(filePaths).toContain('apps/api/src/modules/auth/auth.service.ts');
    expect(filePaths).toContain('apps/api/prisma/schema.prisma');
    expect(filePaths).toContain('apps/api/src/cache/redis.ts');
    expect(filePaths).toContain('apps/api/src/queues/queue.ts');
    expect(filePaths).toContain('apps/api/src/queues/worker.ts');
    expect(filePaths).toContain('apps/api/src/observability/logger.ts');
    expect(filePaths).toContain('apps/api/src/observability/metrics.ts');
    expect(filePaths).toContain('apps/api/src/observability/tracing.ts');
    expect(filePaths).toContain('apps/web/package.json');
    expect(filePaths).toContain('apps/web/app/page.tsx');
    expect(filePaths).toContain('infrastructure/terraform/main.tf');
    expect(filePaths).toContain('infrastructure/terraform/vpc.tf');
    expect(filePaths).toContain('infrastructure/terraform/compute.tf');
    expect(filePaths).toContain('.github/workflows/ci.yml');
  });

  it('should generate pure Infrastructure-Only Kubernetes stack', async () => {
    const k8sConfig: ForgeConfig = {
      version: '1.0',
      project: { name: 'k8s-infra', type: 'infrastructure', packageManager: 'pnpm' },
      infrastructure: {
        cloud: 'local',
        iac: 'kubernetes',
        kubernetes: { ingress: true, hpa: true, monitoring: true, namespace: 'k8s-infra' },
      },
      observability: { logging: 'pino', metrics: 'prometheus', tracing: 'none', healthChecks: true },
      containers: { docker: true, compose: false },
      cicd: { provider: 'github-actions' },
    };

    const files = await orchestrateProjectGeneration(k8sConfig);
    const filePaths = files.map((f) => f.path);

    expect(filePaths).toContain('forge.config.yaml');
    expect(filePaths).toContain('infrastructure/k8s/namespace.yaml');
    expect(filePaths).toContain('infrastructure/k8s/api-deployment.yaml');
    expect(filePaths).toContain('infrastructure/k8s/api-service.yaml');
    expect(filePaths).toContain('infrastructure/k8s/hpa.yaml');
    expect(filePaths).toContain('infrastructure/k8s/ingress.yaml');
  });
});
