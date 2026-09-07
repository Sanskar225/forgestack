import type { ForgeConfig } from '@sanskar225/core';
import type { GeneratedFile } from '../types.js';

export function generateDockerFiles(config: ForgeConfig, isMonorepo: boolean): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const { containers, backend, frontend, database, cache, queue } = config;

  if (!containers?.docker) {
    return files;
  }

  const hasBackend = backend && backend.framework !== 'none';
  const hasFrontend = frontend && frontend.framework !== 'none';
  const hasPostgres = database?.provider === 'postgresql';
  const hasMongo = database?.provider === 'mongodb';
  const hasRedis = cache?.provider === 'redis' || cache?.provider === 'elasticache' || queue?.provider === 'bullmq';
  const hasWorker = queue?.provider === 'bullmq';

  // 1. Backend Dockerfile
  if (hasBackend) {
    const backendPath = isMonorepo ? 'apps/api' : '.';
    const backendDockerfile = `# Multi-stage Production Dockerfile for Backend API
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
${database?.orm === 'prisma' ? 'COPY prisma ./prisma/' : ''}
RUN npm ci

COPY . .
RUN npm run build
${database?.orm === 'prisma' ? 'RUN npx prisma generate' : ''}

# Production Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 forgestack

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
${database?.orm === 'prisma' ? 'COPY --from=builder /app/prisma ./prisma\nCOPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma\nCOPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma' : ''}
RUN npm ci --only=production

USER forgestack
EXPOSE ${backend.port || 4000}

CMD ["node", "dist/index.js"]
`;
    files.push({
      path: `${backendPath}/Dockerfile`,
      content: backendDockerfile,
    });
  }

  // 2. Docker Compose
  if (containers.compose) {
    const services: Record<string, any> = {};

    if (hasPostgres) {
      services['postgres'] = {
        image: 'postgres:16-alpine',
        container_name: `${config.project.name}-postgres`,
        environment: {
          POSTGRES_USER: 'postgres',
          POSTGRES_PASSWORD: 'postgrespassword',
          POSTGRES_DB: 'app_db',
        },
        ports: ['5432:5432'],
        volumes: ['postgres_data:/var/lib/postgresql/data'],
        healthcheck: {
          test: ['CMD-SHELL', 'pg_isready -U postgres'],
          interval: '5s',
          timeout: '5s',
          retries: 5,
        },
      };
    }

    if (hasMongo) {
      services['mongodb'] = {
        image: 'mongo:7-jammy',
        container_name: `${config.project.name}-mongodb`,
        ports: ['27017:27017'],
        volumes: ['mongo_data:/data/db'],
      };
    }

    if (hasRedis) {
      services['redis'] = {
        image: 'redis:7-alpine',
        container_name: `${config.project.name}-redis`,
        ports: ['6379:6379'],
        volumes: ['redis_data:/data'],
        healthcheck: {
          test: ['CMD', 'redis-cli', 'ping'],
          interval: '5s',
          timeout: '5s',
          retries: 5,
        },
      };
    }

    if (hasBackend) {
      const apiDependsOn: Record<string, any> = {};
      if (hasPostgres) apiDependsOn['postgres'] = { condition: 'service_healthy' };
      if (hasRedis) apiDependsOn['redis'] = { condition: 'service_healthy' };

      services['api'] = {
        build: {
          context: isMonorepo ? './apps/api' : '.',
          dockerfile: 'Dockerfile',
        },
        container_name: `${config.project.name}-api`,
        ports: [`${backend.port || 4000}:${backend.port || 4000}`],
        environment: {
          PORT: String(backend.port || 4000),
          NODE_ENV: 'development',
          DATABASE_URL: hasPostgres ? 'postgresql://postgres:postgrespassword@postgres:5432/app_db?schema=public' : undefined,
          REDIS_HOST: hasRedis ? 'redis' : undefined,
          REDIS_PORT: hasRedis ? '6379' : undefined,
        },
        depends_on: Object.keys(apiDependsOn).length > 0 ? apiDependsOn : undefined,
      };

      if (hasWorker) {
        services['worker'] = {
          build: {
            context: isMonorepo ? './apps/api' : '.',
            dockerfile: 'Dockerfile',
          },
          container_name: `${config.project.name}-worker`,
          environment: {
            NODE_ENV: 'development',
            DATABASE_URL: hasPostgres ? 'postgresql://postgres:postgrespassword@postgres:5432/app_db?schema=public' : undefined,
            REDIS_HOST: 'redis',
            REDIS_PORT: '6379',
          },
          depends_on: {
            redis: { condition: 'service_healthy' },
          },
        };
      }
    }

    const composeObj = {
      version: '3.8',
      services,
      volumes: {
        ...(hasPostgres ? { postgres_data: null } : {}),
        ...(hasMongo ? { mongo_data: null } : {}),
        ...(hasRedis ? { redis_data: null } : {}),
      },
    };

    // Format docker-compose YAML
    const yamlLines = [
      '# Generated by ForgeStack Architecture Engine',
      'version: "3.8"',
      '',
      'services:',
    ];

    for (const [name, svc] of Object.entries(services)) {
      yamlLines.push(`  ${name}:`);
      if (svc.image) yamlLines.push(`    image: ${svc.image}`);
      if (svc.container_name) yamlLines.push(`    container_name: ${svc.container_name}`);
      if (svc.build) {
        yamlLines.push(`    build:`);
        yamlLines.push(`      context: ${svc.build.context}`);
        yamlLines.push(`      dockerfile: ${svc.build.dockerfile}`);
      }
      if (svc.ports) {
        yamlLines.push(`    ports:`);
        svc.ports.forEach((p: string) => yamlLines.push(`      - "${p}"`));
      }
      if (svc.environment) {
        yamlLines.push(`    environment:`);
        for (const [k, v] of Object.entries(svc.environment)) {
          if (v !== undefined) yamlLines.push(`      ${k}: "${v}"`);
        }
      }
      if (svc.volumes) {
        yamlLines.push(`    volumes:`);
        svc.volumes.forEach((v: string) => yamlLines.push(`      - ${v}`));
      }
      if (svc.depends_on) {
        yamlLines.push(`    depends_on:`);
        for (const [dep, cond] of Object.entries(svc.depends_on)) {
          yamlLines.push(`      ${dep}:`);
          yamlLines.push(`        condition: ${(cond as any).condition}`);
        }
      }
      yamlLines.push('');
    }

    if (Object.keys(composeObj.volumes).length > 0) {
      yamlLines.push('volumes:');
      for (const vol of Object.keys(composeObj.volumes)) {
        yamlLines.push(`  ${vol}:`);
      }
    }

    files.push({
      path: 'docker-compose.yml',
      content: yamlLines.join('\n') + '\n',
    });
  }

  return files;
}
