export function renderSharedTypesPackage(projectName: string) {
  const packageJson = {
    name: `@${projectName}/types`,
    version: '0.1.0',
    private: true,
    main: './dist/index.js',
    types: './dist/index.d.ts',
    type: 'module',
    scripts: {
      build: 'tsc',
      dev: 'tsc --watch',
    },
    devDependencies: {
      typescript: '^5.7.3',
    },
  };

  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      declaration: true,
      outDir: './dist',
      rootDir: './src',
      strict: true,
    },
    include: ['src/**/*'],
  };

  const indexTs = `// Shared Data Transfer Objects (DTOs) and Domain Entities
export interface UserDTO {
  id: string;
  email: string;
  name?: string;
  role: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  checks: Record<string, boolean>;
}
`;

  return { packageJson: JSON.stringify(packageJson, null, 2), tsconfig: JSON.stringify(tsconfig, null, 2), indexTs };
}

export function renderSharedConfigPackage(projectName: string) {
  const packageJson = {
    name: `@${projectName}/config`,
    version: '0.1.0',
    private: true,
    main: './dist/index.js',
    types: './dist/index.d.ts',
    type: 'module',
    scripts: {
      build: 'tsc',
    },
    devDependencies: {
      typescript: '^5.7.3',
    },
  };

  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      declaration: true,
      outDir: './dist',
      rootDir: './src',
      strict: true,
    },
    include: ['src/**/*'],
  };

  const indexTs = `export const APP_CONFIG = {
  appName: '${projectName}',
  apiVersion: 'v1',
  defaultPaginationLimit: 20,
} as const;
`;

  return { packageJson: JSON.stringify(packageJson, null, 2), tsconfig: JSON.stringify(tsconfig, null, 2), indexTs };
}

export function renderWorkerApp(projectName: string) {
  const packageJson = {
    name: `${projectName}-worker`,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      build: 'tsc',
      start: 'node dist/index.js',
      dev: 'tsx watch src/index.ts',
    },
    dependencies: {
      bullmq: '^5.41.6',
      ioredis: '^5.5.0',
      pino: '^9.6.0',
      dotenv: '^16.4.7',
    },
    devDependencies: {
      typescript: '^5.7.3',
      '@types/node': '^22.13.5',
      tsx: '^4.19.3',
    },
  };

  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      outDir: './dist',
      rootDir: './src',
      strict: true,
    },
    include: ['src/**/*'],
  };

  const indexTs = `import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import pino from 'pino';
import dotenv from 'dotenv';

dotenv.config();

const logger = pino({ level: 'info' });

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null,
});

logger.info('🚀 Starting dedicated ForgeStack BullMQ Worker process...');

const worker = new Worker(
  'background-tasks',
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Processing background task');
    await new Promise((r) => setTimeout(r, 1000));
    logger.info({ jobId: job.id }, 'Completed background task');
  },
  { connection: redis, concurrency: 5 }
);

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Job processing failed');
});
`;

  return { packageJson: JSON.stringify(packageJson, null, 2), tsconfig: JSON.stringify(tsconfig, null, 2), indexTs };
}
