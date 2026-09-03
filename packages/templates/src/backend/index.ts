export interface TemplateOptions {
  projectName: string;
  framework: 'express' | 'fastify';
  architecture: 'modular-monolith' | 'clean-architecture' | 'mvc';
  port: number;
  hasDatabase: boolean;
  databaseProvider?: 'postgresql' | 'mongodb' | 'mysql' | 'dynamodb' | 'none';
  databaseOrm?: 'prisma' | 'drizzle' | 'mongoose' | 'typeorm' | 'none';
  hasCache: boolean;
  hasQueue: boolean;
  hasAuth: boolean;
  hasMetrics: boolean;
  hasTracing: boolean;
}

export function renderBackendAppTemplate(opts: TemplateOptions): string {
  if (opts.framework === 'express') {
    return `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './modules/health/health.routes.js';
import { logger } from './observability/logger.js';
${opts.hasMetrics ? `import { getMetrics, getContentType, httpRequestDurationHistogram, httpRequestsTotal } from './observability/metrics.js';` : ''}
${opts.hasAuth ? `import { authRouter } from './modules/auth/auth.routes.js';` : ''}

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

${
  opts.hasMetrics
    ? `app.use((req, res, next) => {
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

app.use('/', healthRouter);
${opts.hasAuth ? `app.use('/api/v1/auth', authRouter);` : ''}

app.get('/api/v1/hello', (req, res) => {
  res.json({ message: 'Hello from ForgeStack Express Backend!', timestamp: new Date() });
});
`;
  }

  return `import Fastify from 'fastify';
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
}

export function renderCleanArchitectureLayers(opts: TemplateOptions) {
  const entity = `export interface UserEntity {
  id: string;
  email: string;
  name?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}
`;

  const repositoryInterface = `import type { UserEntity } from '../entities/user.entity.js';

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(data: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'> & { passwordHash: string }): Promise<UserEntity>;
}
`;

  const useCase = `import type { IUserRepository } from '../repositories/user.repository.interface.js';
import type { UserEntity } from '../entities/user.entity.js';

export class GetUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<UserEntity | null> {
    return this.userRepository.findById(userId);
  }
}
`;

  const controller = `import type { Request, Response } from 'express';
import type { GetUserUseCase } from '../usecases/get-user.usecase.js';

export class UserController {
  constructor(private readonly getUserUseCase: GetUserUseCase) {}

  async getUser(req: Request, res: Response): Promise<void> {
    const user = await this.getUserUseCase.execute(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  }
}
`;

  return { entity, repositoryInterface, useCase, controller };
}
