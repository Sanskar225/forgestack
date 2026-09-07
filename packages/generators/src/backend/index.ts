import { resolveBackendDependencies, type ForgeConfig } from '@sanskar22/core';
import type { GeneratedFile } from '../types.js';

export function generateBackendFiles(config: ForgeConfig, basePath: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const { backend, database, cache, auth, queue, observability } = config;

  if (!backend || backend.framework === 'none') {
    return files;
  }

  const isExpress = backend.framework === 'express';
  const isFastify = backend.framework === 'fastify';
  const hasAuth = auth && auth.strategy === 'jwt';
  const hasDb = database && database.provider !== 'none';
  const hasCache = cache && cache.provider !== 'none';
  const hasBullMQ = queue?.provider === 'bullmq';
  const hasMetrics = observability?.metrics === 'prometheus';
  const hasTracing = observability?.tracing === 'opentelemetry';

  // 1. package.json
  const manifest = resolveBackendDependencies(config);
  const pkgJson = {
    name: `${config.project.name}-api`,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: manifest.scripts,
    dependencies: manifest.dependencies,
    devDependencies: manifest.devDependencies,
  };

  files.push({
    path: `${basePath}/package.json`,
    content: JSON.stringify(pkgJson, null, 2),
  });

  // 2. tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      lib: ['ES2022'],
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      outDir: './dist',
      rootDir: './src',
      declaration: true,
    },
    include: ['src/**/*'],
  };

  files.push({
    path: `${basePath}/tsconfig.json`,
    content: JSON.stringify(tsconfig, null, 2),
  });

  // 3. src/config/env.ts
  const envTs = `import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('${backend.port || 4000}').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ${hasDb ? `DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/app_db'),` : ''}
  ${hasCache || hasBullMQ ? `REDIS_HOST: z.string().default('localhost'),\n  REDIS_PORT: z.string().default('6379').transform(Number),` : ''}
  ${hasAuth ? `JWT_SECRET: z.string().default('dev-jwt-secret-key-replace-in-prod'),\n  JWT_EXPIRES_IN: z.string().default('15m'),` : ''}
});

export const env = envSchema.parse(process.env);
`;
  files.push({
    path: `${basePath}/src/config/env.ts`,
    content: envTs,
  });

  // 4. Health Module (src/modules/health/*)
  const healthServiceTs = `import { checkDatabaseHealth } from '../../db/client.js';
${hasCache || hasBullMQ ? `import { checkRedisHealth } from '../../cache/redis.js';` : ''}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    ${hasDb ? 'database?: boolean;' : ''}
    ${hasCache || hasBullMQ ? 'redis?: boolean;' : ''}
  };
}

export async function getLiveStatus(): Promise<{ status: string; uptime: number }> {
  return {
    status: 'ok',
    uptime: process.uptime(),
  };
}

export async function getReadyStatus(): Promise<HealthStatus> {
  const checks: HealthStatus['checks'] = {};
  let isHealthy = true;

  ${
    hasDb
      ? `try {
    checks.database = await checkDatabaseHealth();
    if (!checks.database) isHealthy = false;
  } catch {
    checks.database = false;
    isHealthy = false;
  }`
      : ''
  }

  ${
    hasCache || hasBullMQ
      ? `try {
    checks.redis = await checkRedisHealth();
    if (!checks.redis) isHealthy = false;
  } catch {
    checks.redis = false;
    isHealthy = false;
  }`
      : ''
  }

  return {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  };
}
`;

  // Write health files
  if (isExpress) {
    const healthControllerExpress = `import type { Request, Response } from 'express';
import { getLiveStatus, getReadyStatus } from './health.service.js';

export async function livenessHandler(req: Request, res: Response): Promise<void> {
  const live = await getLiveStatus();
  res.status(200).json(live);
}

export async function readinessHandler(req: Request, res: Response): Promise<void> {
  const ready = await getReadyStatus();
  const statusCode = ready.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(ready);
}
`;
    const healthRoutesExpress = `import { Router } from 'express';
import { livenessHandler, readinessHandler } from './health.controller.js';

export const healthRouter = Router();

healthRouter.get('/health', livenessHandler);
healthRouter.get('/health/live', livenessHandler);
healthRouter.get('/health/ready', readinessHandler);
`;
    files.push({ path: `${basePath}/src/modules/health/health.service.ts`, content: healthServiceTs });
    files.push({ path: `${basePath}/src/modules/health/health.controller.ts`, content: healthControllerExpress });
    files.push({ path: `${basePath}/src/modules/health/health.routes.ts`, content: healthRoutesExpress });
  } else if (isFastify) {
    const healthRoutesFastify = `import type { FastifyPluginAsync } from 'fastify';
import { getLiveStatus, getReadyStatus } from './health.service.js';

export const healthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (request, reply) => {
    return getLiveStatus();
  });

  fastify.get('/health/live', async (request, reply) => {
    return getLiveStatus();
  });

  fastify.get('/health/ready', async (request, reply) => {
    const ready = await getReadyStatus();
    if (ready.status !== 'healthy') {
      reply.status(503);
    }
    return ready;
  });
};
`;
    files.push({ path: `${basePath}/src/modules/health/health.service.ts`, content: healthServiceTs });
    files.push({ path: `${basePath}/src/modules/health/health.routes.ts`, content: healthRoutesFastify });
  }

  // 5. Auth Module (if enabled)
  if (hasAuth && isExpress) {
    const authTs = `import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import type { Request, Response, NextFunction } from 'express';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateTokens(payload: TokenPayload) {
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId: payload.userId }, env.JWT_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

export function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

export function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
`;
    files.push({ path: `${basePath}/src/modules/auth/auth.service.ts`, content: authTs });
  }

  // 6. App file (src/app.ts)
  if (isExpress) {
    const expressApp = `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './modules/health/health.routes.js';
import { logger } from './observability/logger.js';
${hasMetrics ? `import { getMetrics, getContentType, httpRequestDurationHistogram, httpRequestsTotal } from './observability/metrics.js';` : ''}

export const app = express();

// Security & Parsing Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

${
  hasMetrics
    ? `// Observability Metrics Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    httpRequestDurationHistogram.observe({ method: req.method, route, status_code: res.statusCode }, duration);
    httpRequestsTotal.inc({ method: req.method, route, status_code: res.statusCode });
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', getContentType());
  res.send(await getMetrics());
});`
    : ''
}

// Routes
app.use('/', healthRouter);

app.get('/api/v1/hello', (req, res) => {
  res.json({ message: 'Hello from ForgeStack Express Backend!', timestamp: new Date() });
});
`;
    files.push({ path: `${basePath}/src/app.ts`, content: expressApp });
  } else if (isFastify) {
    const fastifyApp = `import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { healthPlugin } from './modules/health/health.routes.js';
import { logger } from './observability/logger.js';

export async function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
  });

  await app.register(helmet);
  await app.register(cors);
  await app.register(healthPlugin);

  app.get('/api/v1/hello', async () => {
    return { message: 'Hello from ForgeStack Fastify Backend!', timestamp: new Date() };
  });

  return app;
}
`;
    files.push({ path: `${basePath}/src/app.ts`, content: fastifyApp });
  }

  // 7. Entrypoint (src/index.ts)
  const indexTs = `${hasTracing ? `import { startTracing, shutdownTracing } from './observability/tracing.js';\nstartTracing();\n` : ''}
import { env } from './config/env.js';
import { logger } from './observability/logger.js';
${hasDb ? `import { connectDatabase } from './db/client.js';` : ''}
${hasCache || hasBullMQ ? `import { connectRedis } from './cache/redis.js';` : ''}
${hasBullMQ ? `import './queues/worker.js';\nimport { stopWorkers } from './queues/worker.js';` : ''}
${isExpress ? `import { app } from './app.js';` : `import { buildApp } from './app.js';`}

async function bootstrap() {
  ${hasDb ? `await connectDatabase();` : ''}
  ${hasCache || hasBullMQ ? `await connectRedis();` : ''}

  ${
    isExpress
      ? `const server = app.listen(env.PORT, () => {
    logger.info(\`🚀 HTTP Server running on http://localhost:\${env.PORT}\`);
  });

  const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, 'Graceful shutdown initiated');
    server.close(async () => {
      ${hasBullMQ ? 'await stopWorkers();' : ''}
      ${hasTracing ? 'await shutdownTracing();' : ''}
      logger.info('HTTP server closed cleanly');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));`
      : `const app = await buildApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  logger.info(\`🚀 HTTP Server running on http://localhost:\${env.PORT}\`);`
  }
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Fatal error during server bootstrap');
  process.exit(1);
});
`;

  files.push({
    path: `${basePath}/src/index.ts`,
    content: indexTs,
  });

  return files;
}
