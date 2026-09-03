import type { ForgeConfig } from '@forgestack/core';

export const BUILTIN_PRESETS: Record<string, (name: string) => ForgeConfig> = {
  saas: (name: string): ForgeConfig => ({
    version: '1.0',
    project: {
      name,
      type: 'fullstack',
      packageManager: 'pnpm',
      version: '0.1.0',
    },
    frontend: {
      framework: 'nextjs',
      language: 'typescript',
      styling: 'tailwind',
      state: 'zustand',
      apiClient: 'tanstack-query',
    },
    backend: {
      framework: 'express',
      language: 'typescript',
      architecture: 'modular-monolith',
      port: 4000,
    },
    database: {
      provider: 'postgresql',
      orm: 'prisma',
    },
    cache: {
      provider: 'redis',
    },
    auth: {
      strategy: 'jwt',
      features: ['refresh-tokens', 'rate-limiting'],
    },
    queue: {
      provider: 'bullmq',
    },
    infrastructure: {
      cloud: 'aws',
      aws: {
        compute: 'ecs',
        database: 'rds',
        storage: ['s3'],
        cache: 'elasticache',
        networking: ['vpc', 'alb'],
      },
      iac: 'terraform',
    },
    observability: {
      logging: 'pino',
      metrics: 'prometheus',
      tracing: 'opentelemetry',
      healthChecks: true,
    },
    containers: {
      docker: true,
      compose: true,
    },
    cicd: {
      provider: 'github-actions',
    },
  }),

  'minimal-api': (name: string): ForgeConfig => ({
    version: '1.0',
    project: {
      name,
      type: 'backend',
      packageManager: 'pnpm',
      version: '0.1.0',
    },
    backend: {
      framework: 'express',
      language: 'typescript',
      architecture: 'modular-monolith',
      port: 4000,
    },
    database: {
      provider: 'none',
      orm: 'none',
    },
    cache: {
      provider: 'none',
    },
    auth: {
      strategy: 'none',
    },
    queue: {
      provider: 'none',
    },
    infrastructure: {
      cloud: 'local',
      iac: 'none',
    },
    observability: {
      logging: 'pino',
      metrics: 'prometheus',
      tracing: 'opentelemetry',
      healthChecks: true,
    },
    containers: {
      docker: true,
      compose: true,
    },
    cicd: {
      provider: 'github-actions',
    },
  }),

  'infra-aws': (name: string): ForgeConfig => ({
    version: '1.0',
    project: {
      name,
      type: 'infrastructure',
      packageManager: 'pnpm',
      version: '0.1.0',
    },
    infrastructure: {
      cloud: 'aws',
      aws: {
        compute: 'ecs',
        database: 'rds',
        storage: ['s3'],
        cache: 'elasticache',
        messaging: ['sqs'],
        networking: ['vpc', 'alb'],
        security: ['iam'],
      },
      iac: 'terraform',
    },
    observability: {
      logging: 'pino',
      metrics: 'prometheus',
      tracing: 'opentelemetry',
      healthChecks: true,
    },
    containers: {
      docker: true,
      compose: false,
    },
    cicd: {
      provider: 'github-actions',
    },
  }),

  'infra-k8s': (name: string): ForgeConfig => ({
    version: '1.0',
    project: {
      name,
      type: 'infrastructure',
      packageManager: 'pnpm',
      version: '0.1.0',
    },
    infrastructure: {
      cloud: 'local',
      iac: 'kubernetes',
      kubernetes: {
        ingress: true,
        hpa: true,
        monitoring: true,
        namespace: name,
      },
    },
    observability: {
      logging: 'pino',
      metrics: 'prometheus',
      tracing: 'none',
      healthChecks: true,
    },
    containers: {
      docker: true,
      compose: false,
    },
    cicd: {
      provider: 'github-actions',
    },
  }),
};
