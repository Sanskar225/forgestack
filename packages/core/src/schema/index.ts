import { z } from 'zod';
import YAML from 'yaml';
import type { ForgeConfig } from '../types/index.js';

export const ProjectTypeSchema = z.enum(['fullstack', 'frontend', 'backend', 'infrastructure']);
export const PackageManagerSchema = z.enum(['pnpm', 'npm', 'yarn', 'bun']);

export const FrontendConfigSchema = z.object({
  framework: z.enum(['nextjs', 'react-vite', 'vue', 'svelte', 'none']),
  language: z.enum(['typescript', 'javascript']).default('typescript'),
  styling: z.enum(['tailwind', 'shadcn', 'css-modules', 'none']).default('tailwind'),
  state: z.enum(['zustand', 'redux', 'tanstack-query', 'none']).optional(),
  apiClient: z.enum(['tanstack-query', 'axios', 'fetch']).optional(),
  deployment: z.enum(['vercel', 'aws', 'docker', 'kubernetes', 'static']).optional(),
});

export const BackendConfigSchema = z.object({
  framework: z.enum(['express', 'fastify', 'nestjs', 'hono', 'none']),
  language: z.enum(['typescript', 'javascript']).default('typescript'),
  architecture: z.enum(['modular-monolith', 'clean-architecture', 'mvc']).default('modular-monolith'),
  port: z.number().int().positive().default(4000),
});

export const DatabaseConfigSchema = z.object({
  provider: z.enum(['postgresql', 'mysql', 'mongodb', 'dynamodb', 'none']),
  orm: z.enum(['prisma', 'drizzle', 'mongoose', 'typeorm', 'none']),
});

export const CacheConfigSchema = z.object({
  provider: z.enum(['redis', 'valkey', 'elasticache', 'none']),
});

export const AuthConfigSchema = z.object({
  strategy: z.enum(['jwt', 'oauth', 'session', 'none']),
  features: z.array(z.enum(['refresh-tokens', 'rate-limiting', 'account-lockout', 'oauth-google', 'oauth-github'])).optional(),
});

export const QueueConfigSchema = z.object({
  provider: z.enum(['bullmq', 'sqs', 'rabbitmq', 'none']),
});

export const AwsConfigSchema = z.object({
  compute: z.enum(['ecs', 'eks', 'ec2', 'lambda', 'none']).optional(),
  database: z.enum(['rds', 'aurora', 'dynamodb', 'none']).optional(),
  storage: z.array(z.enum(['s3', 'efs'])).optional(),
  cache: z.enum(['elasticache', 'none']).optional(),
  messaging: z.array(z.enum(['sqs', 'sns', 'msk', 'amazon-mq'])).optional(),
  networking: z.array(z.enum(['vpc', 'alb', 'nlb', 'cloudfront', 'route53'])).optional(),
  security: z.array(z.enum(['iam', 'kms', 'secrets-manager'])).optional(),
});

export const InfrastructureConfigSchema = z.object({
  cloud: z.enum(['aws', 'gcp', 'azure', 'local', 'none']).default('local'),
  aws: AwsConfigSchema.optional(),
  iac: z.enum(['terraform', 'kubernetes', 'pulumi', 'none']).default('none'),
  kubernetes: z.object({
    ingress: z.boolean().default(true),
    hpa: z.boolean().default(true),
    monitoring: z.boolean().default(true),
    namespace: z.string().default('default'),
  }).optional(),
});

export const ObservabilityConfigSchema = z.object({
  logging: z.enum(['pino', 'winston', 'none']).default('pino'),
  metrics: z.enum(['prometheus', 'cloudwatch', 'none']).default('prometheus'),
  tracing: z.enum(['opentelemetry', 'xray', 'none']).default('opentelemetry'),
  errorTracking: z.enum(['sentry', 'none']).optional(),
  healthChecks: z.boolean().default(true),
});

export const ContainersConfigSchema = z.object({
  docker: z.boolean().default(true),
  compose: z.boolean().default(true),
});

export const CicdConfigSchema = z.object({
  provider: z.enum(['github-actions', 'gitlab-ci', 'none']).default('github-actions'),
});

export const ForgeConfigSchema = z.object({
  version: z.string().default('1.0'),
  project: z.object({
    name: z.string().min(1, 'Project name is required'),
    type: ProjectTypeSchema,
    packageManager: PackageManagerSchema.default('pnpm'),
    version: z.string().optional().default('0.1.0'),
    description: z.string().optional(),
  }),
  frontend: FrontendConfigSchema.optional(),
  backend: BackendConfigSchema.optional(),
  database: DatabaseConfigSchema.optional(),
  cache: CacheConfigSchema.optional(),
  auth: AuthConfigSchema.optional(),
  queue: QueueConfigSchema.optional(),
  infrastructure: InfrastructureConfigSchema.optional(),
  observability: ObservabilityConfigSchema.optional(),
  containers: ContainersConfigSchema.optional(),
  cicd: CicdConfigSchema.optional(),
});

export function parseForgeConfig(raw: string | Record<string, unknown>): ForgeConfig {
  let parsedJson: unknown;
  if (typeof raw === 'string') {
    try {
      parsedJson = YAML.parse(raw);
    } catch {
      parsedJson = JSON.parse(raw);
    }
  } else {
    parsedJson = raw;
  }
  return ForgeConfigSchema.parse(parsedJson) as ForgeConfig;
}

export function serializeForgeConfig(config: ForgeConfig): string {
  return YAML.stringify(config, { indent: 2 });
}
