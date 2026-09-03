import type { ForgeConfig, ValidationIssue, ValidationResult } from '../types/index.js';

export function validateForgeConfig(config: ForgeConfig): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const { project, frontend, backend, database, cache, auth, queue, infrastructure, containers } = config;

  // 1. Project Type Integrity
  if (project.type === 'fullstack') {
    if (!frontend || frontend.framework === 'none') {
      errors.push({
        code: 'ERR_FULLSTACK_NO_FRONTEND',
        level: 'error',
        message: 'Full-stack project requires a valid frontend framework configuration.',
        recommendation: 'Specify a frontend framework (e.g. Next.js or React+Vite).',
      });
    }
    if (!backend || backend.framework === 'none') {
      errors.push({
        code: 'ERR_FULLSTACK_NO_BACKEND',
        level: 'error',
        message: 'Full-stack project requires a valid backend framework configuration.',
        recommendation: 'Specify a backend framework (e.g. Express or Fastify).',
      });
    }
  } else if (project.type === 'frontend') {
    if (!frontend || frontend.framework === 'none') {
      errors.push({
        code: 'ERR_FRONTEND_MISSING',
        level: 'error',
        message: 'Frontend project requires a valid frontend framework.',
        recommendation: 'Choose Next.js, React+Vite, Vue, or Svelte.',
      });
    }
  } else if (project.type === 'backend') {
    if (!backend || backend.framework === 'none') {
      errors.push({
        code: 'ERR_BACKEND_MISSING',
        level: 'error',
        message: 'Backend project requires a valid backend framework.',
        recommendation: 'Choose Express, Fastify, NestJS, or Hono.',
      });
    }
  } else if (project.type === 'infrastructure') {
    if (!infrastructure || infrastructure.iac === 'none') {
      errors.push({
        code: 'ERR_INFRA_NO_IAC',
        level: 'error',
        message: 'Infrastructure-only project requires an IaC provider (Terraform or Kubernetes).',
        recommendation: 'Select Terraform or Kubernetes manifests.',
      });
    }
  }

  // 2. Database and ORM Compatibility
  if (database && database.provider !== 'none') {
    if (database.orm === 'mongoose' && database.provider !== 'mongodb') {
      errors.push({
        code: 'ERR_MONGOOSE_DB_MISMATCH',
        level: 'error',
        message: `Mongoose ORM is only compatible with MongoDB, but '${database.provider}' was selected.`,
        recommendation: 'Change ORM to Prisma or Drizzle, or change database to MongoDB.',
      });
    }

    if (database.provider === 'mongodb' && database.orm === 'drizzle') {
      warnings.push({
        code: 'WARN_DRIZZLE_MONGO',
        level: 'warning',
        message: 'Drizzle ORM has limited support for MongoDB. Mongoose or Prisma is recommended.',
        recommendation: 'Switch ORM to Mongoose or Prisma for MongoDB.',
      });
    }
  }

  // 3. Auth Requirements
  if (auth && (auth.strategy === 'jwt' || auth.strategy === 'session')) {
    if (!database || database.provider === 'none') {
      errors.push({
        code: 'ERR_AUTH_NO_DATABASE',
        level: 'error',
        message: `Authentication strategy '${auth.strategy}' requires a database for user and credential persistence.`,
        recommendation: 'Configure a database provider (PostgreSQL or MongoDB) with an ORM.',
      });
    }
  }

  // 4. Queue / Worker Requirements (BullMQ)
  if (queue && queue.provider === 'bullmq') {
    const hasRedis = cache?.provider === 'redis' || cache?.provider === 'elasticache' || cache?.provider === 'valkey';
    if (!hasRedis) {
      errors.push({
        code: 'ERR_BULLMQ_NO_REDIS',
        level: 'error',
        message: 'BullMQ requires Redis as its message store backend.',
        recommendation: 'Enable Redis cache provider (cache: { provider: "redis" }).',
        autoFix: (cfg) => ({
          ...cfg,
          cache: { provider: 'redis' },
        }),
      });
    }

    // BullMQ on AWS Lambda mismatch check
    if (infrastructure?.cloud === 'aws' && infrastructure?.aws?.compute === 'lambda') {
      warnings.push({
        code: 'WARN_LAMBDA_BULLMQ_MISMATCH',
        level: 'warning',
        message: 'AWS Lambda is an ephemeral serverless runtime, while BullMQ workers require long-running persistent processes.',
        recommendation: 'Use AWS SQS + Lambda for serverless background tasks, OR run BullMQ on AWS ECS (Fargate).',
      });
    }
  }

  // 5. Container & Orchestration Consistency
  if (infrastructure?.iac === 'kubernetes') {
    if (!containers?.docker) {
      warnings.push({
        code: 'WARN_K8S_WITHOUT_DOCKER',
        level: 'warning',
        message: 'Kubernetes orchestration requires Docker containerization to build container images.',
        recommendation: 'Enable Docker container support (containers: { docker: true }).',
        autoFix: (cfg) => ({
          ...cfg,
          containers: { docker: true, compose: cfg.containers?.compose ?? true },
        }),
      });
    }
  }

  // 6. AWS Architecture Consistency
  if (infrastructure?.cloud === 'aws' && infrastructure.aws) {
    const { compute, database: awsDb, cache: awsCache } = infrastructure.aws;

    if (compute === 'ecs' && !infrastructure.aws.networking?.includes('vpc')) {
      warnings.push({
        code: 'WARN_ECS_NO_VPC',
        level: 'warning',
        message: 'AWS ECS deployments require a VPC with public/private subnets.',
        recommendation: 'Include VPC in AWS networking configuration.',
      });
    }

    if (cache?.provider === 'redis' && awsCache === 'none') {
      warnings.push({
        code: 'WARN_REDIS_NO_ELASTICACHE',
        level: 'warning',
        message: 'Application uses Redis, but AWS ElastiCache is not selected in AWS architecture.',
        recommendation: 'Select AWS ElastiCache for cloud Redis provisioning.',
      });
    }

    if (database?.provider === 'postgresql' && awsDb === 'none') {
      warnings.push({
        code: 'WARN_POSTGRES_NO_RDS',
        level: 'warning',
        message: 'Application uses PostgreSQL, but AWS RDS is not selected in AWS architecture.',
        recommendation: 'Select AWS RDS (PostgreSQL) or Aurora in AWS architecture.',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function autoFixForgeConfig(config: ForgeConfig): ForgeConfig {
  let updated = { ...config };
  const result = validateForgeConfig(updated);

  for (const err of [...result.errors, ...result.warnings]) {
    if (err.autoFix) {
      updated = err.autoFix(updated);
    }
  }

  return updated;
}
