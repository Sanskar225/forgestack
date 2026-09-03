import type { ForgeConfig, DependencyManifest } from '../types/index.js';

export function resolveBackendDependencies(config: ForgeConfig): DependencyManifest {
  const deps: Record<string, string> = {};
  const devDeps: Record<string, string> = {
    typescript: '^5.7.3',
    '@types/node': '^22.13.5',
    tsx: '^4.19.3',
    rimraf: '^6.0.1',
  };
  const scripts: Record<string, string> = {
    build: 'tsc',
    start: 'node dist/index.js',
    dev: 'tsx watch src/index.ts',
    clean: 'rimraf dist',
  };
  const envVariables: Record<string, { description: string; defaultValue?: string; required: boolean }> = {
    PORT: { description: 'Backend HTTP server listening port', defaultValue: String(config.backend?.port || 4000), required: true },
    NODE_ENV: { description: 'Node environment (development/production/test)', defaultValue: 'development', required: true },
  };

  const { backend, database, cache, auth, queue, observability } = config;

  // Framework
  if (backend?.framework === 'express') {
    deps['express'] = '^4.21.2';
    deps['cors'] = '^2.8.5';
    deps['helmet'] = '^8.0.0';
    devDeps['@types/express'] = '^5.0.0';
    devDeps['@types/cors'] = '^2.8.17';
  } else if (backend?.framework === 'fastify') {
    deps['fastify'] = '^5.2.1';
    deps['@fastify/cors'] = '^10.0.2';
    deps['@fastify/helmet'] = '^13.0.1';
  }

  // Database & ORM
  if (database?.provider === 'postgresql') {
    envVariables['DATABASE_URL'] = {
      description: 'PostgreSQL connection connection string',
      defaultValue: 'postgresql://postgres:postgres@localhost:5432/app_db?schema=public',
      required: true,
    };
    if (database.orm === 'prisma') {
      deps['@prisma/client'] = '^6.4.1';
      devDeps['prisma'] = '^6.4.1';
      scripts['db:migrate'] = 'prisma migrate dev';
      scripts['db:generate'] = 'prisma generate';
      scripts['db:studio'] = 'prisma studio';
    } else if (database.orm === 'drizzle') {
      deps['drizzle-orm'] = '^0.39.3';
      deps['postgres'] = '^3.4.5';
      devDeps['drizzle-kit'] = '^0.30.4';
      scripts['db:generate'] = 'drizzle-kit generate';
      scripts['db:migrate'] = 'drizzle-kit migrate';
      scripts['db:studio'] = 'drizzle-kit studio';
    }
  } else if (database?.provider === 'mongodb') {
    envVariables['MONGODB_URI'] = {
      description: 'MongoDB connection connection URI',
      defaultValue: 'mongodb://localhost:27017/app_db',
      required: true,
    };
    if (database.orm === 'mongoose') {
      deps['mongoose'] = '^8.10.1';
    }
  }

  // Cache & Redis
  if (cache?.provider === 'redis' || cache?.provider === 'elasticache' || queue?.provider === 'bullmq') {
    deps['ioredis'] = '^5.5.0';
    envVariables['REDIS_HOST'] = { description: 'Redis host address', defaultValue: 'localhost', required: true };
    envVariables['REDIS_PORT'] = { description: 'Redis listening port', defaultValue: '6379', required: true };
    envVariables['REDIS_PASSWORD'] = { description: 'Redis authentication password (optional)', defaultValue: '', required: false };
  }

  // Queue / Background Workers
  if (queue?.provider === 'bullmq') {
    deps['bullmq'] = '^5.41.6';
  }

  // Authentication
  if (auth?.strategy === 'jwt') {
    deps['jsonwebtoken'] = '^9.0.2';
    deps['bcryptjs'] = '^3.0.2';
    devDeps['@types/jsonwebtoken'] = '^9.0.9';
    devDeps['@types/bcryptjs'] = '^2.4.6';
    envVariables['JWT_SECRET'] = { description: 'Secret key for signing access tokens', defaultValue: 'super-secret-jwt-key-change-in-production', required: true };
    envVariables['JWT_EXPIRES_IN'] = { description: 'JWT expiration duration (e.g. 15m, 1h, 7d)', defaultValue: '15m', required: true };
    envVariables['REFRESH_TOKEN_SECRET'] = { description: 'Secret key for refresh tokens', defaultValue: 'super-secret-refresh-key-change-in-production', required: true };
  }

  // Observability
  if (observability?.logging === 'pino') {
    deps['pino'] = '^9.6.0';
    deps['pino-http'] = '^10.4.0';
    devDeps['pino-pretty'] = '^13.0.0';
  }

  if (observability?.metrics === 'prometheus') {
    deps['prom-client'] = '^15.1.3';
  }

  if (observability?.tracing === 'opentelemetry') {
    deps['@opentelemetry/api'] = '^1.9.0';
    deps['@opentelemetry/sdk-node'] = '^0.57.2';
    deps['@opentelemetry/auto-instrumentations-node'] = '^0.56.1';
  }

  // Validation
  deps['zod'] = '^3.24.2';
  deps['dotenv'] = '^16.4.7';

  return {
    dependencies: deps,
    devDependencies: devDeps,
    scripts,
    envVariables,
  };
}

export function resolveFrontendDependencies(config: ForgeConfig): DependencyManifest {
  const deps: Record<string, string> = {};
  const devDeps: Record<string, string> = {};
  const scripts: Record<string, string> = {};
  const envVariables: Record<string, { description: string; defaultValue?: string; required: boolean }> = {
    NEXT_PUBLIC_API_URL: {
      description: 'Backend API Base URL',
      defaultValue: `http://localhost:${config.backend?.port || 4000}`,
      required: true,
    },
  };

  const { frontend } = config;

  if (frontend?.framework === 'nextjs') {
    deps['next'] = '^15.1.7';
    deps['react'] = '^19.0.0';
    deps['react-dom'] = '^19.0.0';
    devDeps['@types/react'] = '^19.0.10';
    devDeps['@types/react-dom'] = '^19.0.4';
    devDeps['typescript'] = '^5.7.3';
    devDeps['@types/node'] = '^22.13.5';

    scripts['dev'] = 'next dev --port 3000';
    scripts['build'] = 'next build';
    scripts['start'] = 'next start --port 3000';
    scripts['lint'] = 'next lint';
  } else if (frontend?.framework === 'react-vite') {
    deps['react'] = '^19.0.0';
    deps['react-dom'] = '^19.0.0';
    devDeps['@types/react'] = '^19.0.10';
    devDeps['@types/react-dom'] = '^19.0.4';
    devDeps['@vitejs/plugin-react'] = '^4.3.4';
    devDeps['vite'] = '^6.2.0';
    devDeps['typescript'] = '^5.7.3';

    scripts['dev'] = 'vite';
    scripts['build'] = 'tsc && vite build';
    scripts['preview'] = 'vite preview';
  }

  // Styling
  if (frontend?.styling === 'tailwind' || frontend?.styling === 'shadcn') {
    deps['clsx'] = '^2.1.1';
    deps['tailwind-merge'] = '^3.0.2';
    deps['lucide-react'] = '^0.475.0';
    devDeps['tailwindcss'] = '^4.0.9';
    devDeps['@tailwindcss/postcss'] = '^4.0.9';
    devDeps['postcss'] = '^8.5.3';
  }

  // State Management & Data Fetching
  if (frontend?.state === 'zustand') {
    deps['zustand'] = '^5.0.3';
  }
  if (frontend?.apiClient === 'tanstack-query' || frontend?.state === 'tanstack-query') {
    deps['@tanstack/react-query'] = '^5.66.9';
  } else if (frontend?.apiClient === 'axios') {
    deps['axios'] = '^1.7.9';
  }

  return {
    dependencies: deps,
    devDependencies: devDeps,
    scripts,
    envVariables,
  };
}
